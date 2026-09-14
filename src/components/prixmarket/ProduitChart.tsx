'use client'

import { useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface HistoriquePoint {
  id: string
  montant: number
  devise: string
  type: string
  dateCollecte: string
  agent: { id: string; nom: string }
}

interface Props {
  produitId: string
  marcheId: string
  produitNom: string
  marcheNom: string
}

async function fetchHistorique(produitId: string, marcheId: string): Promise<HistoriquePoint[]> {
  const params = new URLSearchParams({ produitId, marcheId })
  const res = await fetch(`/api/v1/prix/historique?${params.toString()}`)
  if (!res.ok) throw new Error('Erreur lors du chargement de l\'historique')
  const json = await res.json()
  return json.data ?? []
}

function formatDate(s: string): string {
  const d = new Date(s)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export function ProduitChart({ produitId, marcheId, produitNom, marcheNom }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['historique', produitId, marcheId],
    queryFn: () => fetchHistorique(produitId, marcheId),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
        Chargement du graphique...
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-destructive">
        Une erreur est survenue.
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
        Aucun historique disponible pour ce produit sur ce marché.
      </div>
    )
  }

  // Sépare GROS et DETAIL
  const gros = data.filter((p) => p.type === 'GROS').map((p) => ({
    date: formatDate(p.dateCollecte),
    rawDate: p.dateCollecte,
    montant: p.montant,
    type: 'GROS',
  }))
  const detail = data.filter((p) => p.type === 'DETAIL').map((p) => ({
    date: formatDate(p.dateCollecte),
    rawDate: p.dateCollecte,
    montant: p.montant,
    type: 'DETAIL',
  }))

  // Fusionne par date
  const byDate = new Map<string, { date: string; gros: number | null; detail: number | null }>()
  for (const g of gros) {
    if (!byDate.has(g.date)) byDate.set(g.date, { date: g.date, gros: null, detail: null })
    byDate.get(g.date)!.gros = g.montant
  }
  for (const d of detail) {
    if (!byDate.has(d.date)) byDate.set(d.date, { date: d.date, gros: null, detail: null })
    byDate.get(d.date)!.detail = d.montant
  }
  const merged = Array.from(byDate.values()).sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  return (
    <div>
      <div className="text-sm text-muted-foreground mb-3">
        Évolution du prix de <strong className="text-foreground">{produitNom}</strong> sur le
        marché <strong className="text-foreground">{marcheNom}</strong>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
              }}
              formatter={(value: number, name: string) => [
                `${new Intl.NumberFormat('fr-FR').format(value)} HTG`,
                name === 'gros' ? 'Prix gros' : 'Prix détail',
              ]}
            />
            <Legend
              formatter={(value) => (
                <span className="text-sm">
                  {value === 'gros' ? 'Prix gros' : 'Prix détail'}
                </span>
              )}
            />
            <Line
              type="monotone"
              dataKey="gros"
              stroke="oklch(0.62 0.16 35)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="gros"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="detail"
              stroke="oklch(0.55 0.13 145)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="detail"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
