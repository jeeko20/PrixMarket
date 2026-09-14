import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { PriceCard } from '@/components/prixmarket/PriceCard'
import { ChevronRight, MapPin, Store } from 'lucide-react'

interface CommunePageProps {
  params: Promise<{ nom: string }>
}

async function getCommuneData(nom: string) {
  // SQLite ne supporte pas mode: 'insensitive'. On cherche en insensitive via toLowerCase côté JS.
  // Pour SQLite, on récupère toutes les communes et on filtre ensuite ; ou on accepte la casse exacte.
  // Ici, on accepte la casse exacte (les liens sont générés avec la bonne casse depuis la base).
  const commune = await db.commune.findFirst({
    where: { nom: { equals: nom } },
    include: {
      marches: { include: { _count: { select: { prix: true } } } },
    },
  })

  if (!commune) return null

  const prix = await db.prix.findMany({
    where: { marche: { communeId: commune.id } },
    include: {
      produit: true,
      marche: { include: { commune: true } },
      agent: true,
    },
    orderBy: { dateCollecte: 'desc' },
    take: 300,
  })

  // Déduplique par (produitId, marcheId, type)
  const vue = new Map<string, (typeof prix)[number]>()
  for (const p of prix) {
    const key = `${p.produitId}|${p.marcheId}|${p.type}`
    if (!vue.has(key)) vue.set(key, p)
  }

  return {
    commune,
    prixUniques: Array.from(vue.values()),
  }
}

export default async function CommunePage({ params }: CommunePageProps) {
  const { nom: nomEncrypted } = await params
  const nom = decodeURIComponent(nomEncrypted)
  const data = await getCommuneData(nom)

  if (!data) {
    notFound()
  }

  const { commune, prixUniques } = data

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6 flex-wrap">
        <Link href="/" className="hover:text-terra">Accueil</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{commune.nom}</span>
      </nav>

      {/* Header de la commune */}
      <div className="rounded-xl border border-border/60 bg-gradient-to-br from-terra/10 via-safran/15 to-jade/10 p-6 mb-8">
        <div className="flex items-center gap-2 text-sm text-terra mb-2">
          <MapPin className="h-4 w-4" />
          Commune
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
          {commune.nom}
        </h1>
        <p className="text-sm text-muted-foreground">
          {prixUniques.length} prix disponible{prixUniques.length > 1 ? 's' : ''} sur{' '}
          {commune.marches.length} marché{commune.marches.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Marchés de la commune */}
      {commune.marches.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Store className="h-5 w-5 text-terra" />
            Marchés de la commune
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {commune.marches.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-border/60 bg-card p-3 text-center"
              >
                <div className="font-medium text-sm">{m.nom}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {m._count.prix} prix collecté{m._count.prix > 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prix récents */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Prix récents à {commune.nom}</h2>
        {prixUniques.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucun prix collecté pour le moment sur cette commune.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prixUniques.map((p) => (
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
        )}
      </div>
    </div>
  )
}
