import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { PriceCard } from '@/components/prixmarket/PriceCard'
import { ProduitChart } from '@/components/prixmarket/ProduitChart'
import { ArrowLeft, ChevronRight } from 'lucide-react'

interface ProduitPageProps {
  params: Promise<{ id: string }>
}

async function getProduitData(id: string) {
  const produit = await db.produit.findUnique({
    where: { id },
    include: {
      prix: {
        include: {
          marche: { include: { commune: true } },
          agent: true,
        },
        orderBy: { dateCollecte: 'desc' },
      },
    },
  })

  if (!produit) return null

  // Déduplique par (marcheId, type) → dernier prix
  const vue = new Map<string, (typeof produit.prix)[number]>()
  for (const p of produit.prix) {
    const key = `${p.marcheId}|${p.type}`
    if (!vue.has(key)) vue.set(key, p)
  }

  // Groupe par marché
  const marchésMap = new Map<string, {
    marcheId: string
    marcheNom: string
    communeId: string
    communeNom: string
    prixGros?: (typeof produit.prix)[number]
    prixDetail?: (typeof produit.prix)[number]
  }>()

  for (const p of vue.values()) {
    const key = p.marcheId
    if (!marchésMap.has(key)) {
      marchésMap.set(key, {
        marcheId: p.marche.id,
        marcheNom: p.marche.nom,
        communeId: p.marche.commune.id,
        communeNom: p.marche.commune.nom,
      })
    }
    const entry = marchésMap.get(key)!
    if (p.type === 'GROS' && !entry.prixGros) entry.prixGros = p
    if (p.type === 'DETAIL' && !entry.prixDetail) entry.prixDetail = p
  }

  return {
    produit,
    dernierPrixParMarche: Array.from(marchésMap.values()),
  }
}

export default async function ProduitPage({ params }: ProduitPageProps) {
  const { id } = await params
  const data = await getProduitData(id)

  if (!data) {
    notFound()
  }

  const { produit, dernierPrixParMarche } = data
  const marcheParDefaut = dernierPrixParMarche[0]

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6 flex-wrap">
        <Link href="/" className="hover:text-terra">Accueil</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/recherche" className="hover:text-terra">Recherche</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{produit.nom}</span>
      </nav>

      <Link
        href="/recherche"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-terra mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Colonne principale : graphique */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
              {produit.nom}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="px-2 py-0.5 rounded-full bg-accent border border-border/60">
                Unité : {produit.unite}
              </span>
              {produit.categorie && (
                <span className="px-2 py-0.5 rounded-full bg-accent border border-border/60">
                  {produit.categorie}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-card p-4 sm:p-6">
            {marcheParDefaut && (
              <ProduitChart
                produitId={produit.id}
                marcheId={marcheParDefaut.marcheId}
                produitNom={produit.nom}
                marcheNom={marcheParDefaut.marcheNom}
              />
            )}
          </div>
        </div>

        {/* Colonne latérale : prix actuels */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Prix actuels</h2>
          {dernierPrixParMarche.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Aucun prix disponible pour ce produit.
            </div>
          ) : (
            <div className="space-y-3">
              {dernierPrixParMarche.map((entry) => (
                <div
                  key={entry.marcheId}
                  className="rounded-lg border border-border/60 bg-card p-4 space-y-2"
                >
                  <Link
                    href={`/commune/${encodeURIComponent(entry.communeNom)}`}
                    className="text-sm font-semibold hover:text-terra"
                  >
                    {entry.marcheNom}
                    <span className="text-xs text-muted-foreground ml-2">
                      {entry.communeNom}
                    </span>
                  </Link>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Gros</div>
                      <div className="font-semibold text-terra">
                        {entry.prixGros
                          ? new Intl.NumberFormat('fr-FR').format(entry.prixGros.montant) + ' HTG'
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Détail</div>
                      <div className="font-semibold text-jade">
                        {entry.prixDetail
                          ? new Intl.NumberFormat('fr-FR').format(entry.prixDetail.montant) + ' HTG'
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Historique global pour le premier marché */}
          {marcheParDefaut && (
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <h3 className="text-sm font-semibold mb-2">Dernières entrées</h3>
              <div className="space-y-1 text-xs text-muted-foreground">
                {data.produit.prix.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex justify-between">
                    <span>{p.type === 'GROS' ? 'Gros' : 'Détail'}</span>
                    <span className="font-medium text-foreground">
                      {new Intl.NumberFormat('fr-FR').format(p.montant)} HTG
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
