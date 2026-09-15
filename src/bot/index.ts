/**
 * Bot Telegram PrixMarket — grammY + i18n + agent IA interchangeable.
 *
 * Lancement : `bun run scripts/run-bot.ts` (lance ce fichier).
 */

import { Bot, InlineKeyboard, type Context } from 'grammy'
import { PrismaClient } from '@prisma/client'
import {
  t,
  tArr,
  getUserLangue,
  setUserLangue,
  type Langue,
} from './i18n'
import { getAIProviderFromEnv, type AIProvider, type ToolDef } from './ai/provider'

const db = new PrismaClient()

const botToken = process.env.TELEGRAM_BOT_TOKEN
if (!botToken) {
  console.error('TELEGRAM_BOT_TOKEN manquant dans .env')
  process.exit(1)
}

const bot = new Bot(botToken)
const aiProvider: AIProvider | null = getAIProviderFromEnv()

if (aiProvider) {
  console.log(`[bot] IA activée — modèle : ${process.env.AI_MODEL}`)
} else {
  console.log('[bot] IA désactivée (clé absente) — mode commandes strictes')
}

// ============================================================
// Helpers
// ============================================================

async function getAgent(telegramId: string) {
  return db.agent.findUnique({
    where: { telegramId: String(telegramId) },
    include: { commune: true },
  })
}

async function getAdmin(telegramId: string) {
  return db.admin.findUnique({ where: { telegramId: String(telegramId) } })
}

// ============================================================
// État de conversation (state machine simple en mémoire)
// ============================================================

interface SoumissionState {
  step: 'produit' | 'marche' | 'prix_gros' | 'prix_detail' | 'confirm'
  produitId?: string
  produitNom?: string
  marcheId?: string
  marcheNom?: string
  prixGros?: number | null
  prixDetail?: number | null
  communeId?: string
  communeNom?: string
}

const soumissions = new Map<string, SoumissionState>()

// ============================================================
// Commandes basiques
// ============================================================

bot.command('start', async (ctx) => {
  const lg = await getUserLangue(ctx.from.id.toString())

  // Vérifie si l'utilisateur a déjà une préférence ; sinon demande la langue
  const pref = await db.userPreference.findUnique({
    where: { telegramId: ctx.from.id.toString() },
  })

  if (!pref) {
    return ctx.reply(t('bot.lang.prompt', lg), {
      reply_markup: new InlineKeyboard()
        .text(t('bot.lang.ht', lg), 'lang_ht')
        .text(t('bot.lang.fr', lg), 'lang_fr'),
    })
  }

  // Message de bienvenue normal
  const lines = [
    t('bot.welcome.title', lg),
    '',
    t('bot.welcome.description', lg),
    '',
    t('bot.welcome.commands_title', lg),
    ...tArr('bot.welcome.commands_list', lg),
    '',
    t('bot.welcome.menu_title', lg),
  ].join('\n')

  await ctx.reply(lines, {
    reply_markup: mainMenu(lg),
  })
})

bot.command('help', async (ctx) => {
  const lg = await getUserLangue(ctx.from.id.toString())
  const lines = [t('bot.welcome.commands_title', lg), ...tArr('bot.welcome.commands_list', lg)].join('\n')
  await ctx.reply(lines)
})

bot.command('langue', async (ctx) => {
  const lg = await getUserLangue(ctx.from.id.toString())
  await ctx.reply(t('bot.lang.prompt', lg), {
    reply_markup: new InlineKeyboard()
      .text(t('bot.lang.ht', lg), 'lang_ht')
      .text(t('bot.lang.fr', lg), 'lang_fr'),
  })
})

// ============================================================
// Commande /prix
// ============================================================

bot.command('prix', async (ctx) => {
  const lg = await getUserLangue(ctx.from.id.toString())
  const args = ctx.message?.text?.split(' ').slice(1) ?? []
  const produitNom = args[0]
  const communeNom = args[1] ?? ''

  if (!produitNom) {
    return ctx.reply(t('bot.prix.usage', lg))
  }

  // Recherche le produit par nom partiel
  const produit = await db.produit.findFirst({
    where: { nom: { contains: produitNom } },
  })
  if (!produit) {
    return ctx.reply(t('bot.prix.not_found', lg, { produit: produitNom }))
  }

  // Récupère les derniers prix par (marcheId, type)
  const prix = await db.prix.findMany({
    where: {
      produitId: produit.id,
      ...(communeNom
        ? { marche: { commune: { nom: { equals: communeNom,  } } } }
        : {}),
    },
    include: { marche: { include: { commune: true } } },
    orderBy: { dateCollecte: 'desc' },
    take: 200,
  })

  if (prix.length === 0) {
    return ctx.reply(
      communeNom
        ? t('bot.prix.not_found_commune', lg, { produit: produit.nom, commune: communeNom })
        : t('bot.prix.not_found', lg, { produit: produit.nom })
    )
  }

  // Déduplique
  const vue = new Map<string, (typeof prix)[number]>()
  for (const p of prix) {
    const key = `${p.marcheId}|${p.type}`
    if (!vue.has(key)) vue.set(key, p)
  }

  const first = prix[0]
  const communeNomFinal = first.marche.commune.nom

  // Groupe par marché (pour affichage tableau)
  const byMarcheMap = new Map<
    string,
    {
      nom: string
      commune: string
      gros?: number
      detail?: number
      date?: Date
    }
  >()
  for (const p of vue.values()) {
    const key = p.marcheId
    if (!byMarcheMap.has(key)) {
      byMarcheMap.set(key, {
        nom: p.marche.nom,
        commune: p.marche.commune.nom,
        date: p.dateCollecte,
      })
    }
    const e = byMarcheMap.get(key)!
    if (p.type === 'GROS' && e.gros === undefined) e.gros = p.montant
    if (p.type === 'DETAIL' && e.detail === undefined) e.detail = p.montant
  }

  const byMarche = Array.from(byMarcheMap.values())

  // Récupère le nom de l'agent qui a collecté (le plus récent)
  const lastPrix = prix[0]
  const agent = lastPrix
    ? await db.agent.findUnique({ where: { id: lastPrix.agentId } })
    : undefined

  // Génère le message formaté avec tableaux séparés GROS / DÉTAIL
  const msg = formatPrixMessage(
    produit.nom,
    communeNomFinal,
    byMarche,
    lg,
    agent?.nom
  )

  await ctx.reply(msg, { parse_mode: 'HTML' })
})

// ============================================================
// Conversation /soumettre (state machine)
// ============================================================

bot.command('soumettre', async (ctx) => {
  const lg = await getUserLangue(ctx.from.id.toString())
  const agent = await getAgent(ctx.from.id.toString())

  if (!agent) {
    return ctx.reply(t('bot.soumettre.not_registered', lg))
  }
  if (!agent.actif) {
    return ctx.reply(t('bot.soumettre.inactive', lg))
  }

  // Démarre la conversation
  soumissions.set(ctx.from.id.toString(), {
    step: 'produit',
    communeId: agent.communeId,
    communeNom: agent.commune.nom,
  })

  // Liste les produits disponibles pour guider
  const produits = await db.produit.findMany({
    orderBy: { nom: 'asc' },
    take: 50,
  })
  const listeProduits = produits.map((p) => `• ${p.nom}`).join('\n')

  await ctx.reply(
    `${t('bot.soumettre.ask_produit', lg)}\n\nListe produits :\n${listeProduits}`
  )
})

// Handler pour la conversation /soumettre (texte libre pendant que l'état est actif)
bot.on('message:text', async (ctx, next) => {
  const text = ctx.message.text
  if (text.startsWith('/')) return next() // laisse les commandes passer

  const userId = ctx.from.id.toString()
  const state = soumissions.get(userId)

  if (!state) {
    // Pas en conversation → tente l'IA conversationnelle
    return await handleAI(ctx)
  }

  const lg = await getUserLangue(userId)

  // /annuler
  if (text.toLowerCase().trim() === '/annuler') {
    soumissions.delete(userId)
    return ctx.reply(t('bot.soumettre.cancelled', lg))
  }

  switch (state.step) {
    case 'produit': {
      const produit = await db.produit.findFirst({
        where: { nom: { contains: text,  } },
      })
      if (!produit) {
        return ctx.reply(t('bot.soumettre.produit_not_found', lg))
      }
      state.produitId = produit.id
      state.produitNom = produit.nom
      state.step = 'marche'

      // Liste les marchés de la commune de l'agent
      const marches = await db.marche.findMany({
        where: { communeId: state.communeId! },
      })
      const listeMarches = marches.map((m) => `• ${m.nom}`).join('\n')
      return ctx.reply(
        `${t('bot.soumettre.produit_selected', lg, { nom: produit.nom })}\n\n${t('bot.soumettre.ask_marche', lg, { commune: state.communeNom! })}\n\n${listeMarches}`
      )
    }

    case 'marche': {
      const marche = await db.marche.findFirst({
        where: {
          communeId: state.communeId!,
          nom: { contains: text,  },
        },
      })
      if (!marche) {
        return ctx.reply(t('bot.soumettre.marche_not_found', lg))
      }
      state.marcheId = marche.id
      state.marcheNom = marche.nom
      state.step = 'prix_gros'
      return ctx.reply(t('bot.soumettre.ask_prix_gros', lg))
    }

    case 'prix_gros': {
      const v = parseMontant(text)
      if (v === null) {
        return ctx.reply(t('bot.soumettre.invalid_montant', lg))
      }
      state.prixGros = v
      state.step = 'prix_detail'
      return ctx.reply(t('bot.soumettre.ask_prix_detail', lg))
    }

    case 'prix_detail': {
      const v = parseMontant(text)
      if (v === null) {
        return ctx.reply(t('bot.soumettre.invalid_montant', lg))
      }
      state.prixDetail = v

      // Vérifie qu'au moins un prix est fourni
      if (state.prixGros === null && state.prixDetail === null) {
        return ctx.reply(t('bot.soumettre.need_both', lg))
      }

      state.step = 'confirm'
      const lines = [t('bot.soumettre.summary_title', lg)]
      lines.push(t('bot.soumettre.summary_produit', lg, { nom: state.produitNom! }))
      lines.push(t('bot.soumettre.summary_marche', lg, { nom: state.marcheNom! }))
      if (state.prixGros !== null) {
        lines.push(t('bot.soumettre.summary_gros', lg, { montant: `${state.prixGros} HTG` }))
      }
      if (state.prixDetail !== null) {
        lines.push(t('bot.soumettre.summary_detail', lg, { montant: `${state.prixDetail} HTG` }))
      }
      lines.push('')
      lines.push(t('bot.soumettre.confirm', lg))
      return ctx.reply(lines.join('\n'))
    }

    case 'confirm': {
      const oui = text.toLowerCase().trim() === 'oui' || text.toLowerCase().trim() === 'wi' || text.toLowerCase().trim() === 'yes'
      if (!oui) {
        soumissions.delete(userId)
        return ctx.reply(t('bot.soumettre.cancelled', lg))
      }

      // Insère les prix via l'API (similaire à POST /api/v1/prix/submit)
      const agent = await getAgent(userId)
      if (!agent) {
        soumissions.delete(userId)
        return ctx.reply(t('bot.soumettre.not_registered', lg))
      }

      try {
        if (state.prixGros !== null) {
          await db.prix.create({
            data: {
              produitId: state.produitId!,
              marcheId: state.marcheId!,
              agentId: agent.id,
              type: 'GROS',
              montant: state.prixGros,
              devise: 'HTG',
              dateCollecte: new Date(),
            },
          })
        }
        if (state.prixDetail !== null) {
          await db.prix.create({
            data: {
              produitId: state.produitId!,
              marcheId: state.marcheId!,
              agentId: agent.id,
              type: 'DETAIL',
              montant: state.prixDetail,
              devise: 'HTG',
              dateCollecte: new Date(),
            },
          })
        }

        soumissions.delete(userId)
        return ctx.reply(t('bot.soumettre.saved', lg))
      } catch (err) {
        console.error('[bot] erreur soumission :', err)
        soumissions.delete(userId)
        return ctx.reply(t('bot.errors.unknown', lg))
      }
    }
  }

  return next()
})

// ============================================================
// Commandes admin
// ============================================================

bot.command('ajouter_agent', async (ctx) => {
  const lg = await getUserLangue(ctx.from.id.toString())
  const admin = await getAdmin(ctx.from.id.toString())
  if (!admin) {
    return ctx.reply(t('bot.admin.not_admin', lg))
  }

  const args = ctx.message?.text?.split(' ').slice(1) ?? []
  if (args.length < 3) {
    return ctx.reply(t('bot.admin.add_agent_usage', lg))
  }

  const [telegramId, ...rest] = args
  // Si exactement 3 args, on suppose que le 3e est la commune
  // Sinon on prend le dernier comme commune et le reste comme nom
  let nom: string
  let communeNom: string
  if (args.length === 3) {
    nom = rest[0]
    communeNom = rest[1]
  } else {
    communeNom = rest[rest.length - 1]
    nom = rest.slice(0, -1).join(' ')
  }

  const commune = await db.commune.findFirst({
    where: { nom: { equals: communeNom,  } },
  })
  if (!commune) {
    const communes = (await db.commune.findMany()).map((c) => c.nom).join(', ')
    return ctx.reply(t('bot.admin.commune_not_found', lg, { communes }))
  }

  const existing = await db.agent.findUnique({ where: { telegramId } })
  if (existing) {
    return ctx.reply(t('bot.admin.agent_exists', lg))
  }

  await db.agent.create({
    data: { telegramId, nom, communeId: commune.id, actif: true },
  })
  return ctx.reply(
    t('bot.admin.agent_added', lg, { nom, telegramId, commune: commune.nom })
  )
})

bot.command('desactiver_agent', async (ctx) => {
  const lg = await getUserLangue(ctx.from.id.toString())
  const admin = await getAdmin(ctx.from.id.toString())
  if (!admin) {
    return ctx.reply(t('bot.admin.not_admin', lg))
  }

  const args = ctx.message?.text?.split(' ').slice(1) ?? []
  if (args.length < 1) {
    return ctx.reply(t('bot.admin.disable_agent_usage', lg))
  }

  const telegramId = args[0]
  const agent = await db.agent.findUnique({ where: { telegramId } })
  if (!agent) {
    return ctx.reply(t('bot.admin.agent_not_found', lg))
  }

  const newActif = !agent.actif
  await db.agent.update({ where: { id: agent.id }, data: { actif: newActif } })

  return ctx.reply(
    newActif
      ? t('bot.admin.agent_enabled', lg, { nom: agent.nom })
      : t('bot.admin.agent_disabled', lg, { nom: agent.nom })
  )
})

bot.command('stats', async (ctx) => {
  const lg = await getUserLangue(ctx.from.id.toString())
  const admin = await getAdmin(ctx.from.id.toString())
  if (!admin) {
    return ctx.reply(t('bot.admin.not_admin', lg))
  }

  const uneSemaineAgo = new Date()
  uneSemaineAgo.setDate(uneSemaineAgo.getDate() - 7)

  const total = await db.prix.count({
    where: { dateCollecte: { gte: uneSemaineAgo } },
  })

  if (total === 0) {
    return ctx.reply(t('bot.admin.stats_none', lg))
  }

  // Par commune
  const parCommuneRows = await db.prix.groupBy({
    by: ['marcheId'],
    where: { dateCollecte: { gte: uneSemaineAgo } },
    _count: { _all: true },
  })
  const marcheIds = parCommuneRows.map((r) => r.marcheId)
  const marches = await db.marche.findMany({
    where: { id: { in: marcheIds } },
    include: { commune: true },
  })
  const mById = new Map(marches.map((m) => [m.id, m]))
  const cMap = new Map<string, number>()
  for (const r of parCommuneRows) {
    const m = mById.get(r.marcheId)
    if (!m) continue
    cMap.set(m.commune.nom, (cMap.get(m.commune.nom) ?? 0) + r._count._all)
  }

  const lines = [
    t('bot.admin.stats_title', lg),
    t('bot.admin.stats_total', lg, { count: total }),
    '',
    t('bot.admin.stats_by_commune', lg),
    ...Array.from(cMap.entries()).map(([c, n]) => `• ${c}: ${n}`),
  ].join('\n')

  return ctx.reply(lines)
})

// ============================================================
// Menu inline (callbacks)
// ============================================================

bot.callbackQuery('lang_ht', async (ctx) => {
  await setUserLangue(ctx.from.id.toString(), 'HT')
  await ctx.answerCallbackQuery()
  const lg: Langue = 'HT'
  await ctx.reply(t('bot.lang.updated_ht', lg))
  return ctx.reply(t('bot.welcome.title', lg) + '\n\n' + t('bot.welcome.description', lg), {
    reply_markup: mainMenu(lg),
  })
})

bot.callbackQuery('lang_fr', async (ctx) => {
  await setUserLangue(ctx.from.id.toString(), 'FR')
  await ctx.answerCallbackQuery()
  const lg: Langue = 'FR'
  await ctx.reply(t('bot.lang.updated_fr', lg))
  return ctx.reply(t('bot.welcome.title', lg) + '\n\n' + t('bot.welcome.description', lg), {
    reply_markup: mainMenu(lg),
  })
})

bot.callbackQuery('menu_search', async (ctx) => {
  await ctx.answerCallbackQuery()
  const lg = await getUserLangue(ctx.from.id.toString())
  const produits = await db.produit.findMany({ orderBy: { nom: 'asc' } })

  if (produits.length === 0) {
    return ctx.reply(lg === 'FR' ? 'Aucun produit disponible.' : 'Pa gen pwodui.')
  }

  const text = lg === 'FR' ? '🔍 Choisissez un produit :' : '🔍 Chwazi yon pwodui :'
  return ctx.reply(text, {
    reply_markup: productsKeyboard(produits, 0, lg),
  })
})

// Pagination des produits
bot.callbackQuery(/^produit_page_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const page = parseInt(ctx.match![1], 10)
  const lg = await getUserLangue(ctx.from.id.toString())
  const produits = await db.produit.findMany({ orderBy: { nom: 'asc' } })

  await ctx.editMessageReplyMarkup({
    reply_markup: productsKeyboard(produits, page, lg),
  })
})

// Affiche les prix d'un produit au clic
bot.callbackQuery(/^produit_(.+)$/, async (ctx) => {
  const produitId = ctx.callbackQuery.data.replace('produit_', '')
  // Ignore si ça matche une autre callback (produit_page_XXX est géré avant)
  if (produitId.startsWith('page_')) return

  await ctx.answerCallbackQuery()
  const lg = await getUserLangue(ctx.from.id.toString())

  const produit = await db.produit.findUnique({ where: { id: produitId } })
  if (!produit) {
    return ctx.reply(lg === 'FR' ? 'Produit introuvable.' : 'Pa jwenen pwodui sa a.')
  }

  // Récupère les derniers prix par (marcheId, type)
  const prix = await db.prix.findMany({
    where: { produitId },
    include: { marche: { include: { commune: true } } },
    orderBy: { dateCollecte: 'desc' },
    take: 100,
  })

  if (prix.length === 0) {
    const kb = new InlineKeyboard()
      .text(lg === 'FR' ? '← Retour' : '← Retounen', 'menu_search').row()
      .text('🏠', 'menu_home')
    return ctx.reply(
      lg === 'FR'
        ? `Aucun prix trouvé pour « ${produit.nom} ».`
        : `Pa gen pri pou « ${produit.nom} ».`,
      { reply_markup: kb }
    )
  }

  // Déduplique par (marcheId, type)
  const vue = new Map<string, (typeof prix)[number]>()
  for (const p of prix) {
    const key = `${p.marcheId}|${p.type}`
    if (!vue.has(key)) vue.set(key, p)
  }

  // Groupe par marché (pour affichage tableau)
  const byMarcheMap = new Map<
    string,
    {
      nom: string
      commune: string
      communeId: string
      gros?: number
      detail?: number
      date?: Date
    }
  >()
  for (const p of vue.values()) {
    const key = p.marcheId
    if (!byMarcheMap.has(key)) {
      byMarcheMap.set(key, {
        nom: p.marche.nom,
        commune: p.marche.commune.nom,
        communeId: p.marche.commune.id,
        date: p.dateCollecte,
      })
    }
    const e = byMarcheMap.get(key)!
    if (p.type === 'GROS' && e.gros === undefined) e.gros = p.montant
    if (p.type === 'DETAIL' && e.detail === undefined) e.detail = p.montant
  }

  // Récupère l'agent qui a collecté (le plus récent)
  const lastPrix = prix[0]
  const agent = lastPrix
    ? await db.agent.findUnique({ where: { id: lastPrix.agentId } })
    : undefined

  // Construit le message avec tableaux séparés GROS / DÉTAIL
  const communeNomFinal = Array.from(byMarcheMap.values())[0]?.commune ?? ''
  const msg = formatPrixMessage(
    produit.nom,
    communeNomFinal,
    Array.from(byMarcheMap.values()),
    lg,
    agent?.nom
  )

  const kb = new InlineKeyboard()
    .text(lg === 'FR' ? '← Autres produits' : '← Lòt pwodui', 'menu_search').row()
    .text('🏠', 'menu_home')

  return ctx.reply(msg, { reply_markup: kb, parse_mode: 'HTML' })
})

bot.callbackQuery('menu_home', async (ctx) => {
  await ctx.answerCallbackQuery()
  const lg = await getUserLangue(ctx.from.id.toString())
  const lines = [
    t('bot.welcome.title', lg),
    '',
    t('bot.welcome.description', lg),
    '',
    t('bot.welcome.menu_title', lg),
  ].join('\n')

  return ctx.reply(lines, {
    reply_markup: mainMenu(lg),
  })
})

// Bouton "noop" utilisé pour afficher de l'info (numéro de page) sans action
bot.callbackQuery('noop', async (ctx) => {
  await ctx.answerCallbackQuery()
})

bot.callbackQuery('menu_commune', async (ctx) => {
  await ctx.answerCallbackQuery()
  const lg = await getUserLangue(ctx.from.id.toString())
  const communes = await db.commune.findMany({
    include: { _count: { select: { marches: true } } },
  })
  const keyboard = new InlineKeyboard()
  for (const c of communes) {
    keyboard.text(`📍 ${c.nom} (${c._count.marches})`, `commune_${c.id}`).row()
  }
  keyboard.text('🏠', 'menu_home')
  return ctx.reply(
    lg === 'FR' ? 'Choisissez une commune :' : 'Chwazi yon komin :',
    { reply_markup: keyboard }
  )
})

bot.callbackQuery(/^commune_/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const lg = await getUserLangue(ctx.from.id.toString())
  const communeId = ctx.callbackQuery.data.replace('commune_', '')
  const commune = await db.commune.findUnique({
    where: { id: communeId },
    include: { marches: true },
  })
  if (!commune) {
    return ctx.reply(lg === 'FR' ? 'Commune introuvable.' : 'Pa jwenen komin sa a.')
  }

  // Liste les derniers prix de cette commune, groupés par produit
  const prix = await db.prix.findMany({
    where: { marche: { communeId } },
    include: { produit: true, marche: true, agent: true },
    orderBy: { dateCollecte: 'desc' },
    take: 50,
  })
  const vue = new Map<string, (typeof prix)[number]>()
  for (const p of prix) {
    const k = `${p.produitId}|${p.marcheId}|${p.type}`
    if (!vue.has(k)) vue.set(k, p)
  }
  if (vue.size === 0) {
    const kb = new InlineKeyboard()
      .text(lg === 'FR' ? '← Retour communes' : '← Retounen', 'menu_commune').row()
      .text('🏠', 'menu_home')
    return ctx.reply(
      lg === 'FR' ? 'Aucun prix collecté pour le moment.' : 'Pa gen pri yo jwenn pou kounye a.',
      { reply_markup: kb }
    )
  }

  // Groupe par produit, puis par marché
  const byProduitMap = new Map<
    string,
    {
      nom: string
      marches: Map<
        string,
        { nom: string; gros?: number; detail?: number; date?: Date }
      >
    }
  >()

  for (const p of vue.values()) {
    if (!byProduitMap.has(p.produitId)) {
      byProduitMap.set(p.produitId, {
        nom: p.produit.nom,
        marches: new Map(),
      })
    }
    const entry = byProduitMap.get(p.produitId)!
    if (!entry.marches.has(p.marcheId)) {
      entry.marches.set(p.marcheId, {
        nom: p.marche.nom,
        date: p.dateCollecte,
      })
    }
    const m = entry.marches.get(p.marcheId)!
    if (p.type === 'GROS' && m.gros === undefined) m.gros = p.montant
    if (p.type === 'DETAIL' && m.detail === undefined) m.detail = p.montant
  }

  // Construit le message : pour chaque produit, un mini-tableau GROS + DÉTAIL
  const isFR = lg === 'FR'
  const sections: string[] = []
  sections.push(`📍 <b>${escapeHtml(commune.nom.toUpperCase())}</b> — ${isFR ? 'derniers prix' : 'dènye pri yo'}`)
  sections.push('')

  for (const [, entry] of byProduitMap) {
    const byMarche = Array.from(entry.marches.values()).map((m) => ({
      nom: m.nom,
      commune: commune.nom,
      gros: m.gros,
      detail: m.detail,
      date: m.date,
    }))
    sections.push(formatPrixMessage(entry.nom, commune.nom, byMarche, lg))
    sections.push('')
  }

  const kb = new InlineKeyboard()
    .text(lg === 'FR' ? '← Autres communes' : '← Lòt komin', 'menu_commune').row()
    .text('🏠', 'menu_home')

  return ctx.reply(sections.join('\n').slice(0, 4000), {
    reply_markup: kb,
    parse_mode: 'HTML',
  })
})

bot.callbackQuery('menu_submit', async (ctx) => {
  await ctx.answerCallbackQuery()
  const lg = await getUserLangue(ctx.from.id.toString())
  // Au lieu d'envoyer du texte, on déclenche directement la conversation /soumettre
  // en simulant la commande (le handler command('soumettre') va traiter)
  const agent = await getAgent(ctx.from.id.toString())
  if (!agent) {
    const kb = new InlineKeyboard().text('🏠', 'menu_home')
    return ctx.reply(t('bot.soumettre.not_registered', lg), { reply_markup: kb })
  }
  if (!agent.actif) {
    const kb = new InlineKeyboard().text('🏠', 'menu_home')
    return ctx.reply(t('bot.soumettre.inactive', lg), { reply_markup: kb })
  }

  // Démarre la conversation
  soumissions.set(ctx.from.id.toString(), {
    step: 'produit',
    communeId: agent.communeId,
    communeNom: agent.commune.nom,
  })

  const produits = await db.produit.findMany({
    orderBy: { nom: 'asc' },
    take: 50,
  })

  // Affiche la liste avec des boutons cliquables pour démarrer la conversation
  const kb = new InlineKeyboard()
  const perPage = 8
  for (let i = 0; i < Math.min(perPage, produits.length); i++) {
    kb.text(produits[i].nom, `submit_produit_${produits[i].id}`).row()
  }
  kb.text('🏠', 'menu_home')

  return ctx.reply(
    `${t('bot.soumettre.ask_produit', lg)}\n\n${lg === 'FR' ? 'Cliquez sur un produit ou écrivez son nom :' : 'Klike sou yon pwodui oswa ekri non li :'}`,
    { reply_markup: kb }
  )
})

// Permet de sélectionner un produit au clic pour démarrer la soumission
bot.callbackQuery(/^submit_produit_(.+)$/, async (ctx) => {
  const produitId = ctx.callbackQuery.data.replace('submit_produit_', '')
  await ctx.answerCallbackQuery()
  const lg = await getUserLangue(ctx.from.id.toString())

  const userId = ctx.from.id.toString()
  const state = soumissions.get(userId)
  if (!state || state.step !== 'produit') {
    return ctx.reply(lg === 'FR' ? 'Session expirée. Utilisez /soumettre.' : 'Sesyon ekspire. Itilize /soumettre.')
  }

  const produit = await db.produit.findUnique({ where: { id: produitId } })
  if (!produit) {
    return ctx.reply(t('bot.soumettre.produit_not_found', lg))
  }

  state.produitId = produit.id
  state.produitNom = produit.nom
  state.step = 'marche'

  // Liste les marchés de la commune de l'agent
  const marches = await db.marche.findMany({
    where: { communeId: state.communeId! },
  })
  const kb = new InlineKeyboard()
  for (const m of marches) {
    kb.text(m.nom, `submit_marche_${m.id}`).row()
  }
  kb.text('🏠', 'menu_home')

  return ctx.reply(
    `${t('bot.soumettre.produit_selected', lg, { nom: produit.nom })}\n\n${t('bot.soumettre.ask_marche', lg, { commune: state.communeNom! })}`,
    { reply_markup: kb }
  )
})

// Permet de sélectionner un marché au clic pour la soumission
bot.callbackQuery(/^submit_marche_(.+)$/, async (ctx) => {
  const marcheId = ctx.callbackQuery.data.replace('submit_marche_', '')
  await ctx.answerCallbackQuery()
  const lg = await getUserLangue(ctx.from.id.toString())

  const userId = ctx.from.id.toString()
  const state = soumissions.get(userId)
  if (!state || state.step !== 'marche') {
    return ctx.reply(lg === 'FR' ? 'Session expirée. Utilisez /soumettre.' : 'Sesyon ekspire. Itilize /soumettre.')
  }

  const marche = await db.marche.findUnique({ where: { id: marcheId } })
  if (!marche || marche.communeId !== state.communeId) {
    return ctx.reply(t('bot.soumettre.marche_not_found', lg))
  }

  state.marcheId = marche.id
  state.marcheNom = marche.nom
  state.step = 'prix_gros'

  return ctx.reply(t('bot.soumettre.ask_prix_gros', lg))
})

bot.callbackQuery('menu_lang', async (ctx) => {
  await ctx.answerCallbackQuery()
  const lg = await getUserLangue(ctx.from.id.toString())
  return ctx.reply(t('bot.lang.prompt', lg), {
    reply_markup: new InlineKeyboard()
      .text(t('bot.lang.ht', lg), 'lang_ht')
      .text(t('bot.lang.fr', lg), 'lang_fr'),
  })
})

// ============================================================
// Agent IA conversationnel (fallback sur texte libre)
// ============================================================

async function handleAI(ctx: Context) {
  const lg = await getUserLangue(ctx.from.id.toString())
  const text = ctx.message && 'text' in ctx.message ? (ctx.message as { text: string }).text : ''
  if (!text) return

  // Si l'IA n'est pas configurée, on demande d'utiliser les commandes
  if (!aiProvider) {
    return ctx.reply(t('bot.ai.unavailable', lg))
  }

  const langueNom = lg === 'FR' ? 'français' : 'créole haïtien'

  // Outils disponibles : recherche de prix, liste communes, etc.
  const tools: ToolDef[] = [
    {
      type: 'function',
      function: {
        name: 'chercher_prix',
        description: 'Recherche le dernier prix connu pour un produit donné, éventuellement filtré par commune.',
        parameters: {
          type: 'object',
          properties: {
            produit: { type: 'string', description: 'Nom du produit (ou partie du nom)' },
            commune: { type: 'string', description: 'Nom de la commune (optionnel)' },
          },
          required: ['produit'],
        },
      },
    },
  ]

  try {
    const response = await aiProvider.chat(
      [
        {
          role: 'system',
          content: t('bot.ai.system_prompt', lg, { langue: langueNom }) +
            '\n\nTu as accès à un outil "chercher_prix" qui prend un nom de produit (et optionnellement une commune) et renvoie les prix connus en gros et détail. Utilise-le systématiquement avant de répondre.',
        },
        { role: 'user', content: text },
      ],
      { tools, toolChoice: 'auto' }
    )

    // Si l'IA a demandé un outil, on l'exécute puis on relance avec les données
    if (response.toolCalls && response.toolCalls.length > 0) {
      const tc = response.toolCalls[0]
      if (tc.name === 'chercher_prix') {
        const args = tc.args as { produit?: string; commune?: string }
        const data = await chercherPrix(args.produit ?? '', args.commune ?? '')

        // Re-call l'IA avec les résultats injectés comme contexte utilisateur
        // (format simple compatible avec tous les LLM, sans dépendre du role "tool")
        const response2 = await aiProvider.chat([
          {
            role: 'system',
            content:
              t('bot.ai.system_prompt', lg, { langue: langueNom }) +
              '\n\nUn outil "chercher_prix" a déjà été appelé pour cette question. Voici les données réelles extraites de la base de données. Utilise-les EXCLUSIVEMENT pour répondre — ne JAMAIS inventer un prix. Si les données sont vides ou ne correspondent pas à la question, dis-le clairement.',
          },
          { role: 'user', content: `Question : ${text}` },
          {
            role: 'user',
            content:
              `Résultat de l'outil chercher_prix (JSON) :\n${JSON.stringify(data, null, 2)}\n\n` +
              `Réponds à ma question en utilisant uniquement ces données, en ${langueNom}.`,
          },
        ])

        const finalText = response2.text || t('bot.ai.unavailable', lg)
        return ctx.reply(finalText.slice(0, 4000)) // Telegram limite à 4096 caractères
      }
    }

    // Pas de tool call → on affiche le texte (mais on vérifie que ce n'est pas vide)
    if (response.text && response.text.trim().length > 0) {
      return ctx.reply(response.text.slice(0, 4000))
    }

    return ctx.reply(t('bot.ai.unavailable', lg))
  } catch (err) {
    console.error('[bot] erreur IA :', err)
    return ctx.reply(t('bot.ai.unavailable', lg))
  }
}

async function chercherPrix(produitNom: string, communeNom: string) {
  const produit = await db.produit.findFirst({
    where: { nom: { contains: produitNom,  } },
  })
  if (!produit) return { trouve: false, message: `Produit "${produitNom}" introuvable.` }

  const prix = await db.prix.findMany({
    where: {
      produitId: produit.id,
      ...(communeNom
        ? { marche: { commune: { nom: { equals: communeNom,  } } } }
        : {}),
    },
    include: { marche: { include: { commune: true } } },
    orderBy: { dateCollecte: 'desc' },
    take: 50,
  })

  // Déduplique
  const vue = new Map<string, (typeof prix)[number]>()
  for (const p of prix) {
    const k = `${p.marcheId}|${p.type}`
    if (!vue.has(k)) vue.set(k, p)
  }

  if (vue.size === 0) {
    return {
      trouve: false,
      message: `Aucun prix trouvé pour "${produit.nom}"${communeNom ? ` à ${communeNom}` : ''}.`,
    }
  }

  const resultats = Array.from(vue.values()).map((p) => ({
    marche: p.marche.nom,
    commune: p.marche.commune.nom,
    type: p.type === 'GROS' ? 'gros' : 'détail',
    montant: p.montant,
    devise: p.devise,
    date: p.dateCollecte.toISOString(),
  }))

  return {
    trouve: true,
    produit: produit.nom,
    commune: communeNom || resultats[0].commune,
    resultats,
  }
}

// ============================================================
// Helpers
// ============================================================

function mainMenu(lg: Langue): InlineKeyboard {
  const kb = new InlineKeyboard()
  // Un bouton par ligne pour bien voir les libellés (mobile-first)
  kb.text(t('bot.menu.search', lg), 'menu_search').row()
  kb.text(t('bot.menu.by_commune', lg), 'menu_commune').row()
  kb.text(t('bot.menu.submit_price', lg), 'menu_submit').row()
  kb.text(t('bot.menu.change_language', lg), 'menu_lang')
  return kb
}

/**
 * Génère un clavier inline paginé pour une liste de produits.
 * Affiche 8 produits par page + boutons de navigation.
 */
function productsKeyboard(
  produits: Array<{ id: string; nom: string }>,
  page: number,
  lg: Langue
): InlineKeyboard {
  const kb = new InlineKeyboard()
  const perPage = 8
  const start = page * perPage
  const end = start + perPage
  const pageItems = produits.slice(start, end)
  const totalPages = Math.ceil(produits.length / perPage)

  // Produits
  for (const p of pageItems) {
    kb.text(p.nom, `produit_${p.id}`).row()
  }

  // Pagination
  if (totalPages > 1) {
    if (page > 0) {
      kb.text(lg === 'FR' ? '⬅️ Précédent' : '⬅️ Anvan', `produit_page_${page - 1}`)
    }
    kb.text(`${page + 1}/${totalPages}`, 'noop')
    if (page < totalPages - 1) {
      kb.text(lg === 'FR' ? 'Suivant ➡️' : 'Pwochen ➡️', `produit_page_${page + 1}`)
    }
    kb.row()
  }

  // Retour menu
  kb.text('🏠', 'menu_home')
  return kb
}

function parseMontant(s: string): number | null {
  const v = s.toLowerCase().trim()
  if (v === 'na' || v === 'n/a' || v === '-') return null
  const n = Number(v.replace(/[^0-9.,]/g, '').replace(',', '.'))
  if (isNaN(n) || n < 0) return null
  return n
}

function formatDateShort(d: Date, lg: Langue): string {
  const diff = Date.now() - d.getTime()
  const h = Math.floor(diff / (1000 * 60 * 60))
  if (h < 1) return lg === 'FR' ? 'à l\'instant' : 'kounye a'
  if (h < 24) return lg === 'FR' ? `il y a ${h}h` : `${h}è depi`
  const jours = Math.floor(h / 24)
  return lg === 'FR' ? `il y a ${jours}j` : `${jours} jou depi`
}

/**
 * Échappe le HTML pour Telegram (parse_mode HTML).
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Tronque ou pad une chaîne à largeur fixe (pour alignement monospace).
 */
function pad(s: string, len: number): string {
  const str = s.length > len ? s.slice(0, len - 1) + '…' : s
  return str + ' '.repeat(Math.max(0, len - str.length))
}

/**
 * Format d'un montant en HTG.
 */
function fmtMontant(n: number | undefined): string {
  if (n === undefined || n === null) return '—'
  return new Intl.NumberFormat('fr-FR').format(n) + ' HTG'
}

/**
 * Construit un "tableau" ASCII joliment formaté pour Telegram (HTML <pre>).
 * Chaque ligne est une entrée avec les colonnes fournies.
 */
function buildTable(
  headers: string[],
  rows: string[][],
  emojiHeaders?: string[]
): string {
  // Calcule la largeur de chaque colonne
  const colWidths = headers.map((h, i) => {
    let w = h.length
    for (const row of rows) {
      if (row[i] && row[i].length > w) w = row[i].length
    }
    return Math.min(w + 2, 22) // marge de 2 espaces, max 22
  })

  // Bordures
  const top = '┌' + colWidths.map((w) => '─'.repeat(w + 2)).join('┬') + '┐'
  const sep = '├' + colWidths.map((w) => '─'.repeat(w + 2)).join('┼') + '┤'
  const bot = '└' + colWidths.map((w) => '─'.repeat(w + 2)).join('┴') + '┘'

  // En-tête (avec emoji si fourni)
  const headerRow =
    '│ ' +
    headers
      .map((h, i) => {
        const prefix = emojiHeaders && emojiHeaders[i] ? emojiHeaders[i] + ' ' : ''
        return pad(prefix + h, colWidths[i])
      })
      .join(' │ ') +
    ' │'

  // Lignes
  const bodyRows = rows.map(
    (row) => '│ ' + row.map((c, i) => pad(c, colWidths[i])).join(' │ ') + ' │'
  )

  return [top, headerRow, sep, ...bodyRows, bot].join('\n')
}

/**
 * Génère un message joliment formaté pour un produit et ses prix par marché.
 * Sépare les prix en gros et au détail dans des tableaux distincts.
 */
function formatPrixMessage(
  produitNom: string,
  communeNom: string,
  byMarche: Array<{
    nom: string
    commune: string
    gros?: number
    detail?: number
    date?: Date
  }>,
  lg: Langue,
  agentNom?: string
): string {
  const isFR = lg === 'FR'
  const lines: string[] = []

  // En-tête stylisé
  lines.push('📊 ════════════════════════════════')
  lines.push(`🍚 <b>${escapeHtml(produitNom.toUpperCase())}</b>`)
  lines.push(`📍 ${escapeHtml(communeNom)}`)
  lines.push('════════════════════════════════')
  lines.push('')

  const hasGros = byMarche.some((m) => m.gros !== undefined)
  const hasDetail = byMarche.some((m) => m.detail !== undefined)

  // Section GROS
  if (hasGros) {
    const rows = byMarche
      .filter((m) => m.gros !== undefined)
      .map((m) => [m.nom, fmtMontant(m.gros)])
    lines.push(`🔴 <b>${isFR ? 'PRIX EN GROS' : 'PRI AN GRO'}</b>`)
    lines.push(
      '<pre>' +
        buildTable(
          [isFR ? 'Marché' : 'Mache', isFR ? 'Prix' : 'Pri'],
          rows
        ) +
        '</pre>'
    )
    lines.push('')
  }

  // Section DÉTAIL
  if (hasDetail) {
    const rows = byMarche
      .filter((m) => m.detail !== undefined)
      .map((m) => [m.nom, fmtMontant(m.detail)])
    lines.push(`🟢 <b>${isFR ? 'PRIX AU DÉTAIL' : 'PRI AN DETAY'}</b>`)
    lines.push(
      '<pre>' +
        buildTable(
          [isFR ? 'Marché' : 'Mache', isFR ? 'Prix' : 'Pri'],
          rows
        ) +
        '</pre>'
    )
    lines.push('')
  }

  // Footer
  const lastUpdate = byMarche.find((m) => m.date)?.date
  if (lastUpdate) {
    lines.push(`🕐 ${isFR ? 'Dernière mise à jour' : 'Dènye mete ajou'} : ${formatDateShort(lastUpdate, lg)}`)
  }
  if (agentNom) {
    lines.push(`👤 ${isFR ? 'Collecté par' : 'Jwenn pa'} : ${escapeHtml(agentNom)}`)
  }

  return lines.join('\n')
}

// ============================================================
// Lancement du bot
// ============================================================

// Log toutes les erreurs grammY (pas de crash silencieux)
bot.catch((err) => {
  console.error('[bot] Erreur grammY :', err.error)
})

// Garde le process en vie même en cas d'erreur non gérée
process.on('uncaughtException', (err) => {
  console.error('[bot] UncaughtException :', err)
})
process.on('unhandledRejection', (err) => {
  console.error('[bot] UnhandledRejection :', err)
})

async function main() {
  console.log('[bot] Démarrage du bot PrixMarket...')
  console.log('[bot] Timestamp:', new Date().toISOString())

  // Enregistre le menu de commandes (le bouton "/" à côté du champ texte)
  // Commandes par défaut (français) + variante créole (langue="ht")
  try {
    // Commandes par défaut — français
    await bot.api.setMyCommands([
      { command: 'start', description: 'Démarrer / message de bienvenue' },
      { command: 'prix', description: 'Consulter un prix (ex: /prix riz delmas)' },
      { command: 'soumettre', description: 'Soumettre un prix (agents uniquement)' },
      { command: 'langue', description: 'Changer de langue (Français / Créole)' },
      { command: 'help', description: 'Afficher l\'aide' },
    ])
    console.log('[bot] Menu de commandes par défaut enregistré')

    // Variante créole pour les utilisateurs dont Telegram est en créole haïtien
    await bot.api.setMyCommands(
      [
        { command: 'start', description: 'Kòmanse / mesaj byenveni' },
        { command: 'prix', description: 'Gade yon pri (egzanp: /prix riz delmas)' },
        { command: 'soumettre', description: 'Voye yon pri (sèlman pou ajan)' },
        { command: 'langue', description: 'Chanje lang (Franse / Kreyòl)' },
        { command: 'help', description: 'Montre èd la' },
      ],
      { language_code: 'ht' }
    )
    console.log('[bot] Menu de commandes créole enregistré')

    // Configure aussi le bouton "Menu" (à côté du champ texte sur mobile)
    await bot.api.setChatMenuButton({
      menu_button: {
        type: 'commands',
      },
    })
    console.log('[bot] Bouton Menu configuré pour afficher les commandes')
  } catch (err) {
    console.error('[bot] Erreur enregistrement menu :', err)
  }

  await bot.start({
    onStart: (botInfo) => {
      console.log(`[bot] Connecté en tant que @${botInfo.username}`)
      console.log('[bot] Bot prêt à recevoir des messages. En attente...')
    },
  })
}

main().catch((err) => {
  console.error('[bot] Erreur fatale :', err)
  // Ne pas process.exit immédiatement — laisser le log visible
})

export { bot }
