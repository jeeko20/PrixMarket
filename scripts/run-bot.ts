/**
 * Lance le bot Telegram PrixMarket.
 * Usage : `bun run scripts/run-bot.ts`
 *
 * Prérequis :
 *  - TELEGRAM_BOT_TOKEN défini dans .env
 *  - Base de données initialisée (bun run scripts/seed.ts)
 *
 * Pour tester sans Telegram : un webhook de test peut être ajouté plus tard.
 */

// Charge les variables d'environnement
import { config } from 'dotenv'
config({ path: '.env' })

// Lance le bot
import '../src/bot/index'
