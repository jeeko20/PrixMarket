'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatMontant, freshBadge, timeAgo } from '@/lib/prix-utils'
import { MapPin, Clock, User } from 'lucide-react'
import Link from 'next/link'

export interface PrixCardData {
  id: string
  montant: number
  devise: string
  type: string
  dateCollecte: string | Date
  produit: {
    id: string
    nom: string
    unite: string
    categorie: string | null
  }
  marche: {
    id: string
    nom: string
    commune: { id: string; nom: string }
  }
  agent?: { id: string; nom: string }
}

const freshColors: Record<string, string> = {
  green: 'bg-jade/15 text-jade border-jade/30',
  orange: 'bg-safran/30 text-foreground/80 border-safran',
  gray: 'bg-muted text-muted-foreground border-border',
}

const typeColors: Record<string, string> = {
  GROS: 'bg-terra/10 text-terra border-terra/30',
  DETAIL: 'bg-jade/10 text-jade border-jade/30',
}

export function PriceCard({ prix, showProduit = true }: { prix: PrixCardData; showProduit?: boolean }) {
  const fresh = freshBadge(prix.dateCollecte)
  const isGros = prix.type === 'GROS'

  return (
    <Card className="overflow-hidden border-border/70 transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            {showProduit && (
              <Link
                href={`/produit/${prix.produit.id}`}
                className="font-semibold text-foreground hover:text-terra transition-colors"
              >
                {prix.produit.nom}
              </Link>
            )}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <Link
                href={`/commune/${encodeURIComponent(prix.marche.commune.nom)}`}
                className="hover:text-terra transition-colors"
              >
                {prix.marche.commune.nom}
              </Link>
              <span className="text-muted-foreground/50">·</span>
              <span>{prix.marche.nom}</span>
            </div>
          </div>
          <Badge variant="outline" className={typeColors[prix.type] || ''}>
            {isGros ? 'Gros' : 'Détail'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-terra">
            {formatMontant(prix.montant, prix.devise)}
          </span>
          {prix.produit.unite && (
            <span className="text-sm text-muted-foreground">/ {prix.produit.unite}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(prix.dateCollecte)}
          </span>
          {prix.agent && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {prix.agent.nom}
            </span>
          )}
        </div>

        <Badge variant="outline" className={freshColors[fresh.color]}>
          {fresh.label}
        </Badge>
      </CardContent>
    </Card>
  )
}

export function PriceCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  )
}
