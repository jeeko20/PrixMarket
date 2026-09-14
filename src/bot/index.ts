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

  let msg = t('bot.prix.result_title', lg, {
    produit: produit.nom,
    commune: communeNomFinal,
  }) + '\n'

  // Groupe par marché
  const byMarche = new Map<string, { nom: string; gros?: number; detail?: number; date?: Date }>()
  for (const p of vue.values()) {
    const key = p.marcheId
    if (!byMarche.has(key)) {
      byMarche.set(key, { nom: p.marche.nom, date: p.dateCollecte })
    }
    const e = byMarche.get(key)!
    if (p.type === 'GROS' && e.gros === undefined) e.gros = p.montant
    if (p.type === 'DETAIL' && e.detail === undefined) e.detail = p.montant
  }

  for (const [marcheId, info] of byMarche) {
    msg += `\n${t('bot.prix.result_marche', lg, { marche: info.nom })}\n`
    if (info.gros !== undefined) {
      msg += t('bot.prix.result_gros', lg, { montant: `${info.gros} HTG` }) + '\n'
    }
    if (info.detail !== undefined) {
      msg += t('bot.prix.result_detail', lg, { montant: `${info.detail} HTG` }) + '\n'
    }
    if (info.date) {
      msg += t('bot.prix.updated', lg, { time: formatDateShort(info.date, lg) }) + '\n'
    }
  }

  await ctx.reply(msg)
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
  return ctx.reply(t('bot.prix.usage', lg))
})

bot.callbackQuery('menu_commune', async (ctx) => {
  await ctx.answerCallbackQuery()
  const lg = await getUserLangue(ctx.from.id.toString())
  const communes = await db.commune.findMany({ include: { _count: { select: { marches: true } } } })
  const keyboard = new InlineKeyboard()
  for (const c of communes) {
    keyboard.text(`📍 ${c.nom} (${c._count.marches})`, `commune_${c.id}`)
  }
  return ctx.reply(lg === 'FR' ? 'Choisissez une commune :' : 'Chwazi yon komin :', {
    reply_markup: keyboard,
  })
})

bot.callbackQuery(/^commune_/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const lg = await getUserLangue(ctx.from.id.toString())
  const communeId = ctx.callbackQuery.data.replace('commune_', '')
  const commune = await db.commune.findUnique({
    where: { id: communeId },
    include: { marches: true },
  })
  if (!commune) return ctx.reply('Commune introuvable.')

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
  if (vue.size === 0) return ctx.reply('Aucun prix collecté pour le moment.')

  const lines: string[] = [`${commune.nom} — derniers prix`]
  for (const p of vue.values()) {
    lines.push(
      `• ${p.produit.nom} (${p.marche.nom}) — ${p.type === 'GROS' ? 'Gro' : 'Detay'}: ${p.montant} HTG`
    )
  }
  return ctx.reply(lines.join('\n'))
})

bot.callbackQuery('menu_submit', async (ctx) => {
  await ctx.answerCallbackQuery()
  // Renvoie vers /soumettre
  return ctx.reply('/soumettre')
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

    // Si l'IA a demandé un outil, on l'exécute
    if (response.toolCalls && response.toolCalls.length > 0) {
      const tc = response.toolCalls[0]
      if (tc.name === 'chercher_prix') {
        const args = tc.args as { produit?: string; commune?: string }
        const data = await chercherPrix(args.produit ?? '', args.commune ?? '')
        // Re-call l'IA avec les résultats
        const response2 = await aiProvider.chat(
          [
            {
              role: 'system',
              content: t('bot.ai.system_prompt', lg, { langue: langueNom }),
            },
            { role: 'user', content: text },
            {
              role: 'assistant',
              content: null as unknown as string,
              // grammY n'attend pas de tool_call ici — on simule avec un message tool
            } as never,
            {
              role: 'user',
              content: `Voici les données réelles issues de la base :\n${JSON.stringify(data)}`,
            },
          ]
        )

        return ctx.reply(response2.text || t('bot.ai.unavailable', lg))
      }
    }

    // Pas de tool call → on affiche le texte
    if (response.text) {
      return ctx.reply(response.text)
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
  kb.text(t('bot.menu.search', lg), 'menu_search')
  kb.text(t('bot.menu.by_commune', lg), 'menu_commune')
  kb.row()
  kb.text(t('bot.menu.submit_price', lg), 'menu_submit')
  kb.text(t('bot.menu.change_language', lg), 'menu_lang')
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

// ============================================================
// Lancement du bot
// ============================================================

async function main() {
  console.log('[bot] Démarrage du bot PrixMarket...')
  await bot.start({
    onStart: (botInfo) => {
      console.log(`[bot] Connecté en tant que @${botInfo.username}`)
    },
  })
}

main().catch((err) => {
  console.error('[bot] Erreur fatale :', err)
  process.exit(1)
})

export { bot }
