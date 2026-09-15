/**
 * Ajoute un admin en base (par Telegram ID + nom).
 * Usage : `bun run scripts/seed-admin.ts <telegram_id> <nom>`
 *
 * Utile pour le premier admin (ensuite les autres peuvent être ajoutés via le site admin
 * ou directement en base).
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const [, , telegramId, ...restNom] = process.argv
  const nom = restNom.join(' ').trim()

  if (!telegramId || !nom) {
    console.error('Usage : bun run scripts/seed-admin.ts <telegram_id> <nom>')
    console.error('Exemple : bun run scripts/seed-admin.ts 123456789 "Jean Dupont"')
    process.exit(1)
  }

  const existing = await db.admin.findUnique({ where: { telegramId } })
  if (existing) {
    console.log(`[info] Admin déjà existant : ${existing.nom} (${existing.telegramId})`)
    process.exit(0)
  }

  const admin = await db.admin.create({
    data: { telegramId, nom },
  })

  console.log(`[ok] Admin créé : ${admin.nom} (telegramId=${admin.telegramId})`)
  console.log('Vous pouvez maintenant utiliser les commandes /ajouter_agent, /desactiver_agent, /stats dans le bot.')
  console.log("Et accéder au dashboard admin sur /admin en entrant votre Telegram ID.")
}

main()
  .catch((e) => {
    console.error('[erreur]', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
