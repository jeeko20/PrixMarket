# PrixMarket — MVP

Plateforme de consultation des prix des marchés en Haïti (gros et détail), organisés par commune. Données collectées par des **agents locaux** via un **bot Telegram**, exposées au public via un **site Next.js**.

**Commune pilote** : Delmas (extension progressive à d'autres communes).

---

## Stack technique

| Composant | Choix | Statut MVP |
|---|---|---|
| Site web | Next.js 16 (App Router, TypeScript, Tailwind CSS, shadcn/ui) | ✅ |
| API REST | Next.js API Routes (`/api/v1`) | ✅ |
| Base de données | Prisma + SQLite (dev) / Neon Postgres (prod) | ✅ |
| Bot Telegram | grammY (TypeScript) | ✅ |
| Bilinguisme | Créole / Français (locales JSON) | ✅ |
| Agent IA | OpenAI-compatible (Mistral / DeepSeek / OpenAI interchangeable) | ✅ |
| Graphiques | Recharts | ✅ |

---

## Démarrage rapide (local)

### 1. Installation

```bash
bun install
```

### 2. Base de données

Le schéma Prisma est dans `prisma/schema.prisma`. Pour initialiser :

```bash
bun run db:push    # Applique le schéma à la base SQLite
bun run scripts/seed.ts   # Insère la commune Delmas, 3 marchés, 12 produits, ~29 prix historiques et un agent de test
```

### 3. Lancer le site web

```bash
bun run dev
```

Le site est accessible sur http://localhost:3000 (preview panel dans l'environnement de dév).

### 4. Configurer le bot Telegram

1. **Créer un bot via [@BotFather](https://t.me/BotFather)** — récupérez le token.
2. Renseigner `.env` :

   ```env
   TELEGRAM_BOT_TOKEN=votre_token_ici
   ADMIN_TELEGRAM_IDS=votre_telegram_id   # pour utiliser les commandes /admin
   ```

3. **Ajouter un admin en base** (optionnel si `ADMIN_TELEGRAM_IDS` est utilisé pour le seed) :

   ```bash
   bun run scripts/seed-admin.ts <votre_telegram_id> <votre_nom>
   ```

4. Lancer le bot :

   ```bash
   bun run scripts/run-bot.ts
   ```

5. Sur Telegram, parlez à votre bot : `/start`, `/langue`, `/prix riz delmas`, `/soumettre`.

---

## Configuration du fournisseur IA (optionnel)

L'agent IA conversationnel permet de poser des questions en langage libre (« c'est combien le riz à Delmas cette semaine ? »). Il est **optionnel** : sans clé IA, le bot continue de fonctionner avec les commandes strictes.

### Variables d'environnement

```env
AI_PROVIDER=mistral           # 'mistral' | 'deepseek' | 'openai-compatible'
AI_API_KEY=votre_cle_api
AI_API_BASE_URL=https://api.mistral.ai/v1   # dépend du fournisseur
AI_MODEL=mistral-small-latest               # nom du modèle
```

### URLs de base par fournisseur

| Fournisseur | `AI_API_BASE_URL` | Exemple de modèle |
|---|---|---|
| Mistral | `https://api.mistral.ai/v1` | `mistral-small-latest` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| Tout compatible OpenAI | URL de base | selon le fournisseur |

### Garde-fous

- Si l'IA est indisponible ou la clé absente, le bot fonctionne en mode commandes strictes.
- L'IA ne doit **jamais** inventer un prix : elle utilise l'outil `chercher_prix` qui interroge la vraie base.
- Les appels IA sont loggés dans la console pour suivre les coûts.

---

## API REST — endpoints

Base : `/api/v1`

### Endpoints publics

| Méthode | Route | Description |
|---|---|---|
| GET | `/prix?produit=&commune=&type=` | Derniers prix filtrés |
| GET | `/prix/historique?produitId=&marcheId=` | Historique d'un produit sur un marché (pour graphique) |
| GET | `/produits?q=&categorie=` | Liste des produits |
| GET | `/communes` | Communes actives (avec nombre de marchés) |
| GET | `/marches?communeId=` | Marchés d'une commune |
| POST | `/prix/submit` | Soumission d'un prix (agent authentifié via `X-Telegram-Id`) |

### Endpoints admin

Toutes les routes admin requièrent le header `X-Telegram-Id` d'un admin enregistré.

| Méthode | Route | Description |
|---|---|---|
| GET | `/admin/agents` | Liste des agents |
| POST | `/admin/agents` | Ajouter un agent |
| PATCH | `/admin/agents/:id` | Activer/désactiver un agent |
| DELETE | `/admin/prix/:id` | Supprimer un prix suspect |
| GET | `/admin/stats` | Statistiques (prix cette semaine par commune) |

### Exemples de requêtes

```bash
# Liste des communes
curl http://localhost:3000/api/v1/communes

# Derniers prix pour un produit (recherche par nom partiel)
curl 'http://localhost:3000/api/v1/prix?produit=riz'

# Historique d'un produit sur un marché (pour graphique)
curl "http://localhost:3000/api/v1/prix/historique?produitId=PRODUIT_ID&marcheId=MARCHE_ID"

# Soumettre un prix (agent)
curl -X POST http://localhost:3000/api/v1/prix/submit \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Id: 0" \
  -d '{"produitId":"...", "marcheId":"...", "type":"GROS", "montant": 3200}'
```

---

## Bot Telegram — commandes

### Pour tout utilisateur

| Commande | Description |
|---|---|
| `/start` | Message de bienvenue + menu inline |
| `/prix <produit> [commune]` | Consulter un prix (ex : `/prix riz delmas`) |
| `/langue` | Changer de langue (créole / français) |
| `/help` | Afficher l'aide |

Menu inline : `🔍 Chercher un prix` · `📍 Voir par commune` · `📝 Soumettre un prix` · `🌐 Changer de langue`.

### Pour les agents (soumission de prix)

Conversation guidée :

1. `/soumettre` → l'agent est vérifié (doit être actif)
2. Le bot demande le produit (avec liste)
3. Le bot demande le marché (limité à la commune de l'agent)
4. Le bot demande le prix en gros (ou `na`)
5. Le bot demande le prix au détail (ou `na`)
6. Récapitulatif + confirmation → insertion en base

### Pour l'admin

| Commande | Description |
|---|---|
| `/ajouter_agent <telegramId> <nom> <commune>` | Enregistrer un nouvel agent |
| `/desactiver_agent <telegramId>` | Activer/désactiver un agent (toggle) |
| `/stats` | Statistiques de la semaine (par commune) |

### Fichiers de traduction

- `src/bot/locales/fr.json` — Français
- `src/bot/locales/ht.json` — Créole haïtien

Tous les textes du bot passent par `t('bot.path.key', lg, { vars })`. Aucun texte codé en dur.

---

## Site web — pages

| Page | Description |
|---|---|
| `/` | Accueil : barre de recherche, stats, derniers prix, CTA devenir agent |
| `/recherche?q=...` | Résultats de recherche avec filtres (type gros/détail, commune) |
| `/produit/[id]` | Détail d'un produit : prix actuels par marché + graphique d'évolution |
| `/commune/[nom]` | Liste des prix d'une commune + marchés |
| `/a-propos` | Le projet, comment devenir agent collecteur |
| `/admin` | Dashboard admin (authentification via Telegram ID, localStorage) |

---

## Structure du projet

```
prixmarket/
├── prisma/
│   └── schema.prisma              # Commune, Marche, Produit, Agent, Prix, Admin, UserPreference
├── scripts/
│   ├── seed.ts                     # Seed Delmas + 3 marchés + 12 produits + 29 prix + 1 agent test
│   └── run-bot.ts                  # Lance le bot Telegram
├── src/
│   ├── app/
│   │   ├── page.tsx               # Accueil
│   │   ├── recherche/page.tsx     # Recherche
│   │   ├── produit/[id]/page.tsx   # Détail produit + graphique
│   │   ├── commune/[nom]/page.tsx # Liste par commune
│   │   ├── a-propos/page.tsx      # À propos
│   │   ├── admin/page.tsx         # Dashboard admin
│   │   └── api/v1/                # API REST
│   ├── bot/
│   │   ├── index.ts               # Bot grammY (commandes + IA)
│   │   ├── i18n.ts                 # Helper traductions
│   │   ├── ai/provider.ts         # Abstraction AIProvider
│   │   └── locales/
│   │       ├── fr.json            # Traductions FR
│   │       └── ht.json            # Traductions HT (créole)
│   ├── components/prixmarket/
│   │   ├── PriceCard.tsx          # Carte de prix réutilisable
│   │   ├── SearchBar.tsx          # Barre de recherche
│   │   ├── CommuneSelector.tsx    # Sélecteur de commune
│   │   ├── ProduitChart.tsx       # Graphique d'évolution (Recharts)
│   │   ├── AdminDashboard.tsx     # Dashboard admin (client)
│   │   ├── SiteHeader.tsx
│   │   └── SiteFooter.tsx
│   └── lib/
│       ├── db.ts                  # Prisma client singleton
│       ├── auth.ts                # Authentification par telegramId
│       └── prix-utils.ts          # formatMontant, freshBadge, timeAgo...
├── .env.example
└── README.md
```

---

## Déploiement

### Site web (Vercel)

```bash
vercel --prod
```

Définir sur Vercel : `DATABASE_URL` (Neon Postgres), `AI_*` si IA activée.

### Bot + API (Railway / Render)

Le bot Telegram et l'API sont dans la même application Next.js. Sur Railway :

1. Créer un nouveau projet depuis ce dépôt
2. Définir le build : `bun install && bun run db:push`
3. Définir le start : `bun run scripts/run-bot.ts & next start`
4. Variables d'environnement à définir : voir `.env.example`

### Base de données (Neon)

1. Créer un projet sur [Neon](https://neon.tech)
2. Récupérer `DATABASE_URL`
3. Adapter `prisma/schema.prisma` : `provider = "postgresql"` (au lieu de `"sqlite"`)
4. `bun run db:push`
5. `bun run scripts/seed.ts`

---

## Données de démo (après seed)

- **Commune** : Delmas
- **Marchés** : Croix-des-Bossales, Tabarre, Marché Delmas 2
- **Produits** : Riz importé, Riz local, Haricot rouge, Haricot blanc, Maïs, Huile végétale, Farine de blé, Sucre, Poudre de tomate, Pâtes alimentaires, Sel, Œuf
- **Agent de test** : `telegramId=0`, commune Delmas
- **~29 prix historiques** (riz, haricot rouge, huile, farine, sucre, maïs, pâtes) répartis sur 0 à 14 jours

---

## Priorités du MVP couvertes

✅ Base de données + API (§5, §6)
✅ Bot — consultation + soumission agent (§7.1, §7.2)
✅ Site — accueil + recherche + page produit (§8)
✅ Sélection de langue créole/français (§7.4)
✅ Bot — commandes admin (§7.3)
✅ Agent IA conversationnel interchangeable (§12)
✅ Site — dashboard admin (§8)

---

## Hors périmètre MVP

- Intégration WhatsApp (phase 2)
- Paiements en ligne
- Alertes de prix automatiques
- Application mobile native

---

## Licence

Projet open-source MVP. Données collectées sur le terrain par des agents locaux.
