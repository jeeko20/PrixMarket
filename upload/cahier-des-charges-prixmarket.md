# Cahier des charges — PrixMarket
**Version MVP — bot Telegram + site web pour consultation des prix de marché en Haïti**

---

## 1. Contexte et objectif du projet

PrixMarket est une plateforme qui permet aux utilisateurs (particuliers, commerçants, acheteurs en gros) de consulter les prix des produits vendus sur les marchés, en gros et au détail, organisés par commune. Le projet démarre avec la commune de **Delmas** et sera étendu progressivement à d'autres communes.

Le système repose sur des **agents locaux** qui collectent les prix sur le terrain et les soumettent via un bot Telegram. Ces données alimentent à la fois le bot (consultation rapide) et un site web (vitrine publique, recherche avancée, statistiques).

### Objectifs du MVP
1. Permettre à des agents de soumettre des prix via Telegram.
2. Permettre à n'importe quel utilisateur de consulter les prix via Telegram ou via le site web.
3. Stocker un historique des prix pour permettre plus tard des graphiques de tendance.
4. Poser une base technique simple, peu coûteuse, et facilement extensible (nouvelles communes, WhatsApp plus tard, alertes de prix, etc.)

### Exigences transverses (à intégrer dès le MVP)
- **Bilinguisme créole / français** : tout utilisateur doit pouvoir choisir la langue dans laquelle le bot lui répond (voir §7.4).
- **Agent IA conversationnel** : le bot doit pouvoir répondre à des questions en langage libre (pas seulement des commandes strictes), via un fournisseur IA externe interchangeable (voir §13).

### Hors périmètre du MVP (à ne PAS construire maintenant)
- Intégration WhatsApp (viendra dans une phase 2)
- Paiements en ligne
- Système d'alertes de prix automatiques
- Application mobile native

---

## 2. Stack technique imposée

| Composant | Choix | Remarque |
|---|---|---|
| Bot | Telegram, librairie **grammY** (TypeScript) | Pas de WhatsApp pour le MVP |
| Backend / API | **Node.js + Express** (TypeScript) | Une seule API consommée par le bot ET le site |
| Base de données | **PostgreSQL hébergé sur Neon** | Utiliser des migrations SQL versionnées (voir §5) |
| ORM | **Prisma** | Facilite les migrations et le typage |
| Site web | **Next.js** (App Router, TypeScript, Tailwind CSS) | Déployé sur Vercel |
| Hébergement bot/API | **Railway** ou **Render** | Choisir celui avec le meilleur tier gratuit au moment du déploiement |
| Stockage images (optionnel MVP) | **Cloudinary** | Pour photos de produits/marchés si le temps le permet |
| Gestion de version | Git, dépôt GitHub avec un monorepo (voir §4) |

---

## 3. Utilisateurs et rôles

1. **Utilisateur (client final)** : consulte les prix, sans compte requis, via Telegram ou le site web.
2. **Agent collecteur** : soumet les prix via le bot Telegram. Doit être enregistré au préalable par un admin (whitelist par `telegram_id`).
3. **Admin (moi)** : gère les agents, valide/supprime les prix suspects, ajoute des produits/communes/marchés, consulte les statistiques d'usage.

---

## 4. Structure du dépôt (monorepo)

```
prixmarket/
├── packages/
│   ├── db/                 # Schéma Prisma + migrations, partagé par bot et api
│   ├── api/                 # API REST Express
│   ├── bot/                  # Bot Telegram (grammY)
│   └── web/                  # Site Next.js
├── package.json               # workspaces (npm ou pnpm)
└── README.md
```

Utiliser des **npm workspaces** (ou pnpm workspaces) pour que `db`, `api`, `bot` et `web` partagent le même client Prisma sans dupliquer le code.

---

## 5. Modèle de données (Prisma schema)

Traduire ce schéma en `schema.prisma` :

```
Commune
  id, nom (unique)

Marche
  id, nom, communeId (FK → Commune)

Produit
  id, nom, unite, categorie (nullable)

Agent
  id, telegramId (unique), nom, communeId (FK → Commune), actif (bool, default true), createdAt

Prix
  id, produitId (FK), marcheId (FK), agentId (FK), type (enum: GROS | DETAIL),
  montant (decimal), devise (default 'HTG'), dateCollecte (default now)

Admin
  id, telegramId (unique), nom

UserPreference
  id, telegramId (unique), langue (enum: FR | HT, default HT)
```

`UserPreference` sert à mémoriser la langue choisie par chaque utilisateur du bot (créole ou français), pour ne pas avoir à redemander à chaque conversation.

Règles :
- `Prix.type` doit être une enum stricte `GROS` / `DETAIL`, pas une string libre.
- Toujours conserver l'historique : ne jamais faire d'`UPDATE` sur un prix existant, toujours **insérer une nouvelle ligne**. Le "prix actuel" = la ligne la plus récente par (produit, marché, type).
- Ajouter un index sur `(produitId, marcheId, type, dateCollecte)` pour accélérer la requête "dernier prix".

---

## 6. API REST — endpoints à créer

Base URL : `/api/v1`

| Méthode | Route | Description | Accès |
|---|---|---|---|
| GET | `/prix?produit=&commune=&type=` | Derniers prix filtrés | Public |
| GET | `/prix/historique?produitId=&marcheId=` | Historique complet d'un produit sur un marché (pour graphique) | Public |
| GET | `/produits` | Liste des produits (recherche par nom) | Public |
| GET | `/communes` | Liste des communes actives | Public |
| GET | `/marches?communeId=` | Marchés d'une commune | Public |
| POST | `/prix` | Soumission d'un nouveau prix | Agent (auth par telegramId) |
| GET | `/admin/agents` | Liste des agents | Admin |
| POST | `/admin/agents` | Ajouter un agent | Admin |
| PATCH | `/admin/agents/:id` | Activer/désactiver un agent | Admin |
| DELETE | `/admin/prix/:id` | Supprimer un prix suspect | Admin |

Toutes les routes `/admin/*` et le POST `/prix` doivent vérifier le `telegramId` de l'appelant contre la table `Agent`/`Admin` correspondante — **pas d'authentification par mot de passe pour le MVP**, l'identité Telegram suffit.

---

## 7. Bot Telegram — flux à implémenter

### 7.1 Pour tout utilisateur (consultation)
- `/start` → message de bienvenue + explication rapide
- `/prix <produit> <commune>` → ex: `/prix riz delmas` → retourne le dernier prix gros et détail connus
- Menu par boutons inline (clavier Telegram) en alternative aux commandes, pour les utilisateurs moins à l'aise avec le texte :
  - "🔍 Chercher un prix"
  - "📍 Voir par commune"
- Réponse type :
  ```
  🍚 Riz (sac 25kg) — Delmas
  Gros : 3200 HTG
  Détail : 145 HTG/lb
  Mis à jour : il y a 6 heures
  ```

### 7.2 Pour un agent (soumission de prix)
Flux conversationnel guidé (utiliser les "conversations" de grammY ou un state machine simple) :
1. Agent tape `/soumettre`
2. Bot vérifie que le `telegramId` est bien un agent actif — sinon message "Vous n'êtes pas enregistré comme agent."
3. Bot demande le produit (avec autocomplétion/liste si possible)
4. Bot demande le marché (limité à la commune de l'agent)
5. Bot demande le prix en gros
6. Bot demande le prix au détail
7. Bot confirme et enregistre via l'API (`POST /prix`)
8. Message de confirmation avec récapitulatif

### 7.3 Pour l'admin
- `/ajouter_agent <telegramId> <nom> <commune>`
- `/desactiver_agent <telegramId>`
- `/stats` → nombre de prix soumis cette semaine, par commune

### 7.4 Sélection de la langue (créole / français)
- Commande `/langue` à tout moment → affiche un clavier inline avec deux boutons : "🇭🇹 Kreyòl" et "🇫🇷 Français"
- Le choix est enregistré dans `UserPreference` (par `telegramId`)
- Au tout premier `/start`, si aucune préférence n'existe encore, demander la langue avant tout autre message
- **Tous les textes du bot** (menus, messages de confirmation, erreurs, réponses de prix) doivent exister dans les deux langues, stockés dans des fichiers de traduction séparés (ex: `locales/fr.json`, `locales/ht.json`) — pas de texte codé en dur dans la logique du bot, pour faciliter l'ajout d'autres langues plus tard
- Les réponses de l'agent IA (§13) doivent aussi être générées dans la langue préférée de l'utilisateur (passer la langue dans le prompt système)

---

## 8. Site web — pages à créer

| Page | Contenu |
|---|---|
| `/` (accueil) | Recherche rapide d'un produit, mise en avant des communes actives, quelques prix "populaires" |
| `/recherche?q=` | Résultats de recherche avec filtres (commune, gros/détail, catégorie) |
| `/produit/[id]` | Détail d'un produit : prix actuels par commune/marché + graphique d'évolution (utiliser une librairie de graphique légère comme Recharts) |
| `/commune/[nom]` | Liste des produits et prix pour une commune donnée |
| `/a-propos` | Explication du projet, comment devenir agent collecteur |
| `/admin` (protégée) | Tableau de bord admin : gestion agents, modération des prix, statistiques |

Le site consomme **exclusivement** l'API `/api/v1` définie au §6 — aucune requête directe à la base de données depuis le frontend.

---

## 9. Design — direction visuelle

- **Identité** : marché local, accessible, confiance. Éviter un style "startup tech froide" — privilégier des couleurs chaleureuses inspirées des marchés haïtiens (terracotta, vert, jaune safran) sur fond clair et neutre.
- **Typographie** : une police sans-serif lisible et moderne pour les titres, une police système pour le corps de texte (performance mobile).
- **Mobile-first impératif** : la majorité des utilisateurs consulteront depuis un téléphone avec une connexion limitée — pages légères, peu d'images lourdes, chargement rapide.
- **Composants clés** :
  - Carte "prix" réutilisable (produit, commune, gros/détail, date de mise à jour, badge de fraîcheur — ex: vert si <24h, orange si <3 jours, gris au-delà)
  - Barre de recherche proéminente dès l'accueil
  - Sélecteur de commune (facile à étendre quand de nouvelles communes seront ajoutées)
- Utiliser Tailwind CSS avec une palette de couleurs personnalisée définie dans `tailwind.config`, pas les couleurs par défaut.

---

## 10. Variables d'environnement attendues

```
DATABASE_URL=            # Neon connection string
TELEGRAM_BOT_TOKEN=
API_BASE_URL=            # utilisée par le bot et le site pour appeler l'API
CLOUDINARY_URL=          # optionnel
ADMIN_TELEGRAM_IDS=      # liste séparée par virgules, seed initial
AI_PROVIDER=             # 'mistral' | 'deepseek' | 'openai-compatible'
AI_API_KEY=
AI_API_BASE_URL=         # utile si AI_PROVIDER = openai-compatible (endpoint custom)
AI_MODEL=                # nom du modèle à utiliser chez le fournisseur choisi
```

---

## 12. Agent IA conversationnel — fournisseur interchangeable

En plus des commandes strictes (§7), le bot doit permettre une conversation en langage libre : un utilisateur peut écrire "c'est combien le riz à Delmas cette semaine ?" sans utiliser `/prix`, et l'agent IA interprète la demande, va chercher les données via l'API interne (§6), puis formule une réponse naturelle dans la langue de l'utilisateur.

### 12.1 Principe d'architecture — abstraction du fournisseur
Ne **jamais** coder en dur un appel à un fournisseur IA spécifique dans la logique du bot. Créer une interface commune, par exemple :

```typescript
interface AIProvider {
  chat(messages: ChatMessage[], options?: { tools?: Tool[] }): Promise<AIResponse>;
}
```

Puis une implémentation par fournisseur (`MistralProvider`, `DeepSeekProvider`, `OpenAICompatibleProvider`), sélectionnée au démarrage selon la variable d'environnement `AI_PROVIDER`. Comme Mistral, DeepSeek et la plupart des fournisseurs récents exposent une API compatible avec le format OpenAI (`/v1/chat/completions`), une seule implémentation générique `OpenAICompatibleProvider` (utilisant juste `AI_API_BASE_URL` + `AI_API_KEY` + `AI_MODEL`) peut suffire pour couvrir les trois cas — à valider en fonction des spécificités de chaque fournisseur au moment du build.

### 12.2 Ce que l'agent IA doit pouvoir faire
- Comprendre une question libre sur un prix, un produit ou une commune
- Appeler les endpoints internes du §6 (via function calling / tool use si le fournisseur le supporte, sinon extraction d'intention puis appel manuel) pour aller chercher la vraie donnée en base — **l'IA ne doit jamais inventer un prix**
- Répondre dans la langue de préférence de l'utilisateur (§7.4)
- Rediriger vers les commandes structurées (`/prix`, `/soumettre`) si la demande sort du cadre du projet

### 12.3 Garde-fous
- Si l'API IA est indisponible ou la clé absente, le bot doit continuer à fonctionner en mode commandes strictes (§7.1-7.3) — l'IA est un confort, pas une dépendance critique
- Prévoir un budget/quota de tokens raisonnable par défaut, et logger les appels IA pour suivre les coûts par fournisseur

---

## 13. Livrables attendus de Claude Code

1. Monorepo fonctionnel avec les 4 packages (`db`, `api`, `bot`, `web`)
2. Migrations Prisma appliquées et schéma conforme au §5
3. Toutes les routes API du §6 implémentées et testées manuellement (exemples de requêtes dans le README)
4. Bot Telegram fonctionnel avec les flux du §7, y compris la sélection de langue (§7.4) et l'intégration de l'agent IA interchangeable (§12)
5. Site Next.js avec les pages du §8, connecté à l'API, respectant la direction design du §9
6. Un script de seed (`prisma/seed.ts`) qui crée : la commune Delmas, 2-3 marchés de Delmas, une dizaine de produits courants (riz, haricot, huile, farine, sucre, etc.), et un agent de test
7. Fichiers de traduction `locales/fr.json` et `locales/ht.json` couvrant tous les textes du bot
8. README avec : instructions d'installation, comment lancer chaque package en local, comment configurer le fournisseur IA (`AI_PROVIDER` et clés associées), comment déployer sur Railway/Render (bot+api) et Vercel (web)

## 14. Priorités si le temps manque

Si tout ne peut pas être fait d'un coup, ordre de priorité :
1. Base de données + API (§5, §6)
2. Bot — consultation + soumission agent, en français uniquement d'abord (§7.1, §7.2)
3. Site — page d'accueil + recherche + page produit (§8)
4. Sélection de langue créole/français (§7.4)
5. Bot — commandes admin (§7.3)
6. Agent IA conversationnel (§12)
7. Site — dashboard admin
