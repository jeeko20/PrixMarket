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
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-terra/10 via-safran/15 to-jade/10">
        <div className="container mx-auto px-4 py-12 sm:py-20">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/60 border border-border/60 text-xs font-medium text-terra">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-terra opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-terra"></span>
              </span>
              Données en direct du terrain
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Les prix du marché haïtien,
              <span className="text-terra"> à portée de main</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              PrixMarket vous permet de consulter en temps réel les prix des
              produits vendus en gros et au détail sur les marchés d'Haïti,
              collectés par des agents locaux. Commencez par Delmas.
            </p>

            <div className="w-full max-w-2xl mx-auto">
              <SearchBar size="lg" autoFocus={false} />
            </div>

            <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
              <span className="text-sm text-muted-foreground">ou parcourez :</span>
              <CommuneSelector />
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-border/60">
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

      {/* CTA AGENT */}
      <section className="bg-secondary/40 border-t border-border/60">
        <div className="container mx-auto px-4 py-12">
          <div className="rounded-xl border border-terra/30 bg-background p-6 sm:p-8 max-w-3xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              Vous êtes commerçant ou acteur du marché ?
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Devenez agent collecteur PrixMarket. Soumettez les prix de votre
              marché directement depuis votre téléphone via Telegram, et
              aidez à construire une information transparente pour tous les
              Haïtiens.
            </p>
            <Link
              href="/a-propos"
              className="inline-flex items-center justify-center rounded-md bg-terra text-terra-foreground px-4 py-2 text-sm font-medium hover:bg-terra/90 transition-colors"
            >
              Comment devenir agent ?
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
