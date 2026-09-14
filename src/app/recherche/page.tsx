import { Suspense } from 'react'
import { SearchBar } from '@/components/prixmarket/SearchBar'
import { PriceCard, PriceCardSkeleton } from '@/components/prixmarket/PriceCard'
import { db } from '@/lib/db'
import { parsePrixType } from '@/lib/prix-utils'

interface SearchPageProps {
  searchParams: Promise<{ q?: string; commune?: string; type?: string; categorie?: string }>
}

async function SearchResults({ q, commune, type, categorie }: {
  q?: string
  commune?: string
  type?: string
  categorie?: string
}) {
  const parsedType = parsePrixType(type)

  const prix = await db.prix.findMany({
    where: {
      type: parsedType ?? undefined,
      produit: {
        nom: q ? { contains: q } : undefined,
        categorie: categorie ?? undefined,
      },
      marche: commune
        ? { commune: { nom: { equals: commune } } }
        : undefined,
    },
    include: {
      produit: true,
      marche: { include: { commune: true } },
      agent: true,
    },
    orderBy: { dateCollecte: 'desc' },
    take: 200,
  })

  // Déduplique
  const vue = new Map<string, (typeof prix)[number]>()
  for (const p of prix) {
    const key = `${p.produitId}|${p.marcheId}|${p.type}`
    if (!vue.has(key)) vue.set(key, p)
  }

  const results = Array.from(vue.values())

  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3">🔍</div>
        <p className="font-medium text-foreground mb-1">Aucun prix trouvé</p>
        <p className="text-sm text-muted-foreground">
          Essayez avec un autre mot-clé, ou consultez{' '}
          <a href="/" className="text-terra underline">l'accueil</a>.
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        {results.length} prix trouvé{results.length > 1 ? 's' : ''}
        {q && <> pour «&nbsp;<strong className="text-foreground">{q}</strong>&nbsp;»</>}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((p) => (
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
                commune: { id: p.marche.commune.id, nom: p.marche.commune.nom },
              },
              agent: { id: p.agent.id, nom: p.agent.nom },
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams
  const q = sp.q?.trim()
  const commune = sp.commune?.trim()
  const type = sp.type?.trim()
  const categorie = sp.categorie?.trim()

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Rechercher un prix
          </h1>
          <SearchBar defaultValue={q} />
        </div>

        {/* Filtres rapides */}
        <div className="flex flex-wrap gap-2 text-sm">
          <a
            href={`/recherche${q ? `?q=${encodeURIComponent(q)}` : ''}`}
            className={`px-3 py-1.5 rounded-full border transition-colors ${
              !type
                ? 'bg-terra text-terra-foreground border-terra'
                : 'bg-background text-foreground/70 border-border hover:bg-accent'
            }`}
          >
            Tous types
          </a>
          <a
            href={`/recherche?${new URLSearchParams({ ...(q && { q }), type: 'GROS' }).toString()}`}
            className={`px-3 py-1.5 rounded-full border transition-colors ${
              type === 'GROS'
                ? 'bg-terra text-terra-foreground border-terra'
                : 'bg-background text-foreground/70 border-border hover:bg-accent'
            }`}
          >
            Gros
          </a>
          <a
            href={`/recherche?${new URLSearchParams({ ...(q && { q }), type: 'DETAIL' }).toString()}`}
            className={`px-3 py-1.5 rounded-full border transition-colors ${
              type === 'DETAIL'
                ? 'bg-terra text-terra-foreground border-terra'
                : 'bg-background text-foreground/70 border-border hover:bg-accent'
            }`}
          >
            Détail
          </a>
          {commune && (
            <a
              href="/recherche"
              className="px-3 py-1.5 rounded-full border bg-background text-foreground/70 border-border hover:bg-accent inline-flex items-center gap-1"
            >
              {commune} ✕
            </a>
          )}
        </div>

        <Suspense
          key={`${q}-${commune}-${type}-${categorie}`}
          fallback={
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <PriceCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <SearchResults q={q} commune={commune} type={type} categorie={categorie} />
        </Suspense>
      </div>
    </div>
  )
}
