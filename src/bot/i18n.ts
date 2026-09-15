/**
 * Internationalisation du bot — charge les fichiers de traduction.
 */

import fr from './locales/fr.json'
import ht from './locales/ht.json'

export type Langue = 'FR' | 'HT'

const locales = { fr, ht } as const

/**
 * Récupère une chaîne traduite par chemin (ex : "bot.welcome.title").
 */
export function t(key: string, locale: Langue, vars?: Record<string, string | number>): string {
  const dict = locale === 'FR' ? locales.fr : locales.ht

  const parts = key.split('.')
  let node: unknown = dict
  for (const p of parts) {
    if (node && typeof node === 'object' && p in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[p]
    } else {
      // fallback FR
      node = undefined
      break
    }
  }

  let result: string
  if (typeof node === 'string') {
    result = node
  } else if (Array.isArray(node)) {
    result = node.join('\n')
  } else {
    // Si la clé n'existe pas en créole, fallback sur le français
    let fb: unknown = locales.fr
    for (const p of parts) {
      if (fb && typeof fb === 'object' && p in (fb as Record<string, unknown>)) {
        fb = (fb as Record<string, unknown>)[p]
      } else {
        return key // introuvable partout
      }
    }
    if (typeof fb === 'string') result = fb
    else if (Array.isArray(fb)) result = fb.join('\n')
    else return key
  }

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }

  return result
}

/**
 * Récupère une liste de chaînes (ex : "bot.welcome.commands_list" renvoie un tableau).
 */
export function tArr(key: string, locale: Langue): string[] {
  const dict = locale === 'FR' ? locales.fr : locales.ht
  const parts = key.split('.')
  let node: unknown = dict
  for (const p of parts) {
    if (node && typeof node === 'object' && p in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[p]
    } else {
      node = undefined
      break
    }
  }
  if (Array.isArray(node)) return node as string[]

  // fallback FR
  let fb: unknown = locales.fr
  for (const p of parts) {
    if (fb && typeof fb === 'object' && p in (fb as Record<string, unknown>)) {
      fb = (fb as Record<string, unknown>)[p]
    } else {
      return []
    }
  }
  return Array.isArray(fb) ? (fb as string[]) : []
}

/**
 * Récupère la langue préférée d'un utilisateur Telegram (depuis la base).
 */
export async function getUserLangue(telegramId: string): Promise<Langue> {
  // Chargement dynamique de Prisma pour éviter les problèmes côté Next
  const { db } = await import('@/lib/db')
  const pref = await db.userPreference.findUnique({ where: { telegramId } })
  if (pref?.langue === 'FR' || pref?.langue === 'HT') return pref.langue
  return 'HT' // défaut créole
}

/**
 * Définit la langue d'un utilisateur.
 */
export async function setUserLangue(telegramId: string, langue: Langue): Promise<void> {
  const { db } = await import('@/lib/db')
  await db.userPreference.upsert({
    where: { telegramId },
    update: { langue },
    create: { telegramId, langue },
  })
}
