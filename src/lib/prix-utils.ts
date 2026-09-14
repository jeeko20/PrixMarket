/**
 * Helpers partagés par l'API et le bot.
 */

export type PrixType = 'GROS' | 'DETAIL'
export type Langue = 'FR' | 'HT'

export interface PrixAvecRelations {
  id: string
  montant: number
  devise: string
  type: string
  dateCollecte: Date
  produit: { id: string; nom: string; unite: string; categorie: string | null }
  marche: { id: string; nom: string; commune: { id: string; nom: string } }
  agent: { id: string; nom: string }
}

/**
 * Badge de fraîcheur d'un prix selon sa date de collecte.
 */
export function freshBadge(dateCollecte: Date | string): {
  level: 'fresh' | 'recent' | 'stale'
  label: string
  color: 'green' | 'orange' | 'gray'
} {
  const date = typeof dateCollecte === 'string' ? new Date(dateCollecte) : dateCollecte
  const ageHours = (Date.now() - date.getTime()) / (1000 * 60 * 60)

  if (ageHours < 24) return { level: 'fresh', label: 'Récent', color: 'green' }
  if (ageHours < 24 * 3) return { level: 'recent', label: '< 3 jours', color: 'orange' }
  return { level: 'stale', label: 'Ancien', color: 'gray' }
}

/**
 * Formate un montant avec séparateur de milliers.
 */
export function formatMontant(montant: number, devise: string = 'HTG'): string {
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(montant)
  return `${formatted} ${devise}`
}

/**
 * Valide qu'une chaîne est un type de prix valide.
 */
export function parsePrixType(value: string | null | undefined): PrixType | null {
  if (!value) return null
  const upper = value.toUpperCase()
  if (upper === 'GROS' || upper === 'DETAIL') return upper
  return null
}

/**
 * Retourne "il y a X" en français.
 */
export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)

  if (seconds < 60) return 'à l\'instant'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `il y a ${days} j`
  const months = Math.floor(days / 30)
  if (months < 12) return `il y a ${months} mois`
  const years = Math.floor(months / 12)
  return `il y a ${years} an${years > 1 ? 's' : ''}`
}
