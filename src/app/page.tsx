import Link from 'next/link'
import { SearchBar } from '@/components/prixmarket/SearchBar'
import { CommuneSelector } from '@/components/prixmarket/CommuneSelector'
import { PriceCard } from '@/components/prixmarket/PriceCard'
import { PriceCardSkeleton } from '@/components/prixmarket/PriceCard'
import { db } from '@/lib/db'
import { Suspense } from 'react'
import { TrendingUp, MapPin, Store, Users, ShoppingBasket } from 'lucide-react'

async function getPopularPrices() {
  // Récupère les prix les plus récents par (produit, marché, type) sur tout le système
  const prix = await db.prix.findMany({
    include: {
      produit: true,
      marche: { include: { commune: true } },
      agent: true,
    },
    orderBy: { dateCollecte: 'desc' },
    take: 200,
  })

  // Déduplique par (produitId, marcheId, type) et prend les premiers
  const vue = new Map<string, (typeof prix)[number]>()
  for (const p of prix) {
    const key = `${p.produitId}|${p.marcheId}|${p.type}`
    if (!vue.has(key)) vue.set(key, p)
  }
  return Array.from(vue.values()).slice(0, 6)
}

async function getStats() {
  const [produits, communes, marches, prix] = await Promise.all([
    db.produit.count(),
    db.commune.count(),
    db.marche.count(),
    db.prix.count(),
  ])
  return({ produits, communes, marches, prix })
}

async function PopularPrices() {
  const prices = await getPopularPrices()
  if (prices.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun prix disponible pour le moment.
      </div>
    )
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {prices.map((p) => (
        <PriceCard
          key={p.id}
          prix={{
            id: p.id,
            montant: p.montant,
            devise: p.devise,
            type: p.type,
            dateCollecte: p.dateCollecte,
            produit: {
              id: p.produit.id,
              nom: p.produit.nom,
              unite: p.produit.unite,
              categorie: p.produit.categorie,
            },
            marche: {
              id: p.marche.id,
              nom: p.marche.nom,
              commune: {
                id: p.marche.commune.id,
                nom: p.marche.commune.nom,
              },
            },
            agent: { id: p.agent.id, nom: p.agent.nom },
          }}
        />
      ))}
    </div>
  )
}

async function Stats() {
  const s = await getStats()
  const items = [
    { icon: ShoppingBasket, label: 'Produits suivis', value: s.produits },
    { icon: MapPin, label: 'Communes', value: s.communes },
    { icon: Store, label: 'Marchés', value: s.marches },
    { icon: Users, label: 'Prix collectés', value: s.prix },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-lg border border-border/60 bg-card p-4 text-center"
        >
          <it.icon className="h-5 w-5 mx-auto text-terra" />
          <div className="mt-2 text-2xl font-bold tracking-tight">{it.value}</div>
          <div className="text-xs text-muted-foreground">{it.label}</div>
        </div>
      ))}
    </div>
  )
}

export default function HomePage() {
  return (
    <div>
      {/* HERO avec image du marché haïtien */}
      <section className="relative overflow-hidden border-b border-border/60">
        {/* Image de fond — marché haïtien */}
        <div className="absolute inset-0">
          <img
            src="/hero/marche-haitien.png"
            alt="Marché haïtien animé avec étals colorés de produits"
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
          {/* Overlay dégradé pour la lisibilité du texte */}
          <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/85 to-terra/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-background/40" />
        </div>

        {/* Contenu par-dessus */}
        <div className="relative container mx-auto px-4 py-16 sm:py-24 lg:py-28">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-sm border border-terra/30 text-xs font-medium text-terra shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-terra opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-terra"></span>
              </span>
              Données en direct du terrain
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Les prix du marché haïtien,
              <span className="block text-terra mt-1">à portée de main</span>
            </h1>

            <p className="text-base sm:text-lg text-foreground/90 max-w-2xl leading-relaxed">
              PrixMarket vous permet de consulter en temps réel les prix des
              produits vendus en gros et au détail sur les marchés d'Haïti,
              collectés par des agents locaux. Commencez par Delmas.
            </p>

            <div className="w-full max-w-2xl">
              <SearchBar size="lg" autoFocus={false} />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="text-sm text-foreground/80">ou parcourez :</span>
              <CommuneSelector />
            </div>

            {/* Indicateurs rapides */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-xs text-foreground/80">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-jade" />
                Données collectées par des agents locaux
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-safran" />
                Mises à jour quotidiennes
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-terra" />
                Gratuit et open-source
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-border/60 bg-secondary/30">
        <div className="container mx-auto px-4 py-10">
          <Suspense fallback={<div className="h-24 animate-pulse rounded bg-muted" />}>
            <Stats />
          </Suspense>
        </div>
      </section>

      {/* POPULAR PRICES */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-terra" />
                Derniers prix collectés
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Les prix les plus récents, mis à jour par nos agents sur le
                terrain.
              </p>
            </div>
            <Link
              href="/recherche"
              className="hidden sm:inline-flex text-sm font-medium text-terra hover:underline whitespace-nowrap"
            >
              Voir tout →
            </Link>
          </div>

          <Suspense
            fallback={
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <PriceCardSkeleton key={i} />
                ))}
              </div>
            }
          >
            <PopularPrices />
          </Suspense>
        </div>
      </section>

      {/* CTA AGENT avec illustration */}
      <section className="bg-gradient-to-br from-terra/10 via-safran/15 to-jade/10 border-t border-border/60">
        <div className="container mx-auto px-4 py-12">
          <div className="grid gap-6 md:grid-cols-2 items-center max-w-5xl mx-auto">
            {/* Texte */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 border border-terra/30 text-xs font-medium text-terra">
                <Users className="h-3.5 w-3.5" />
                Devenir agent collecteur
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Vous êtes commerçant ou acteur du marché ?
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Devenez agent collecteur PrixMarket. Soumettez les prix de votre
                marché directement depuis votre téléphone via Telegram, et
                aidez à construire une information transparente pour tous les
                Haïtiens.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-jade mt-0.5">✓</span>
                  <span>Accès gratuit au bot Telegram</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-jade mt-0.5">✓</span>
                  <span>Soumission en 30 secondes via menu au clic</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-jade mt-0.5">✓</span>
                  <span>Données visibles par toute la communauté haïtienne</span>
                </li>
              </ul>
              <Link
                href="/a-propos"
                className="inline-flex items-center justify-center rounded-md bg-terra text-terra-foreground px-5 py-2.5 text-sm font-medium hover:bg-terra/90 transition-colors mt-2"
              >
                Comment devenir agent ?
              </Link>
            </div>

            {/* Image illustrative */}
            <div className="relative aspect-[3/4] sm:aspect-[4/5] rounded-xl overflow-hidden border border-border/60 shadow-lg">
              <img
                src="/hero/agent-collecteur.png"
                alt="Marchande haïtienne au téléphone dans son marché"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-terra/20 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
