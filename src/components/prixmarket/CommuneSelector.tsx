'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Commune {
  id: string
  nom: string
  marches: number
  agents: number
}

async function fetchCommunes(): Promise<Commune[]> {
  const res = await fetch('/api/v1/communes')
  if (!res.ok) throw new Error('Erreur lors du chargement des communes')
  const json = await res.json()
  // Defensive: s'assurer qu'on retourne toujours un tableau
  const data = json?.data
  if (Array.isArray(data)) return data
  return []
}

/**
 * Sélecteur de commune — facile à étendre quand de nouvelles communes seront ajoutées.
 */
export function CommuneSelector({
  defaultCommune,
}: {
  defaultCommune?: string
} = {}) {
  const router = useRouter()
  const { data, isLoading, error } = useQuery({
    queryKey: ['communes'],
    queryFn: fetchCommunes,
    staleTime: 5 * 60 * 1000,
  })

  if (error) {
    return (
      <div className="text-sm text-muted-foreground">
        Impossible de charger la liste des communes.
      </div>
    )
  }

  // Defensive: TanStack Query peut renvoyer un objet non-tableau dans certains cas
  // (cache corrompu, réponse serveur inattendue). On s'assure d'avoir un tableau.
  const communes: Commune[] = Array.isArray(data) ? data : []

  return (
    <Select
      disabled={isLoading || communes.length === 0}
      defaultValue={defaultCommune}
      onValueChange={(value) => {
        router.push(`/commune/${encodeURIComponent(value)}`)
      }}
    >
      <SelectTrigger className="w-full sm:w-72" aria-label="Choisir une commune">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-terra" />
          <SelectValue placeholder={isLoading ? 'Chargement...' : 'Choisir une commune'} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {communes.map((c) => (
          <SelectItem key={c.id} value={c.nom}>
            <div className="flex items-center justify-between gap-3">
              <span>{c.nom}</span>
              <span className="text-xs text-muted-foreground">
                {c.marches} marché{c.marches > 1 ? 's' : ''}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
