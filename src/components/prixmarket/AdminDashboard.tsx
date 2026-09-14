'use client'

import { useState, useCallback, useSyncExternalStore } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Users, Trash2, Plus, ShieldCheck, AlertTriangle } from 'lucide-react'

interface AdminPretRequest {
  telegramId: string
}

async function apiCall(path: string, options?: RequestInit) {
  const res = await fetch(path, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur inconnue' }))
    throw new Error(err.error || 'Erreur')
  }
  return res.json()
}

export function AdminDashboard() {
  const [pretTelegramId, setPretTelegramId] = useState('')
  const [pretNom, setPretNom] = useState('')
  const [pretCommune, setPretCommune] = useState('')
  const queryClient = useQueryClient()

  // Récupère l'identité admin (localStorage côté client)
  // useSyncExternalStore évite le mismatch SSR : renvoie null côté serveur et lors
  // du premier render client, puis la vraie valeur après mount.
  // Le subscribe écoute un événement custom "adminIdChanged" pour re-render après set.
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener('adminIdChanged', cb)
    return () => window.removeEventListener('adminIdChanged', cb)
  }, [])
  const getClientSnapshot = useCallback(() => {
    try {
      return localStorage.getItem('adminTelegramId')
    } catch {
      return null
    }
  }, [])
  const getServerSnapshot = useCallback(() => null, [])

  const adminTelegramId = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  )

  // Setter : met à jour localStorage puis notifie les subscribers
  const setAdminTelegramId = useCallback((value: string | null) => {
    try {
      if (value === null) {
        localStorage.removeItem('adminTelegramId')
      } else {
        localStorage.setItem('adminTelegramId', value)
      }
      // Notifie le useSyncExternalStore pour qu'il re-lise la valeur
      window.dispatchEvent(new Event('adminIdChanged'))
    } catch (e) {
      console.error('Erreur mise à jour adminTelegramId:', e)
    }
  }, [])

  // Agents
  const { data: agentsData, isLoading: agentsLoading, error: agentsError } = useQuery({
    queryKey: ['admin', 'agents'],
    queryFn: () =>
      apiCall('/api/v1/admin/agents', {
        headers: { 'X-Telegram-Id': adminTelegramId || '' },
      }),
    enabled: !!adminTelegramId,
  })

  // Communes
  const { data: communesData } = useQuery({
    queryKey: ['communes'],
    queryFn: () => apiCall('/api/v1/communes'),
  })

  // Stats (nombre de prix cette semaine par commune)
  const { data: statsData } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiCall('/api/v1/admin/stats'),
    enabled: !!adminTelegramId,
  })

  // Mutation : ajouter agent
  const addAgentMutation = useMutation({
    mutationFn: (data: { telegramId: string; nom: string; communeId: string }) =>
      apiCall('/api/v1/admin/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Id': adminTelegramId || '',
        },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success('Agent ajouté avec succès.')
      setPretTelegramId('')
      setPretNom('')
      setPretCommune('')
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Mutation : toggle agent actif
  const toggleAgentMutation = useMutation({
    mutationFn: ({ id, actif }: { id: string; actif: boolean }) =>
      apiCall(`/api/v1/admin/agents/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Id': adminTelegramId || '',
        },
        body: JSON.stringify({ actif }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] })
      toast.success('Statut de l\'agent mis à jour.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Mutation : supprimer un prix
  const deletePrixMutation = useMutation({
    mutationFn: (prixId: string) =>
      apiCall(`/api/v1/admin/prix/${prixId}`, {
        method: 'DELETE',
        headers: { 'X-Telegram-Id': adminTelegramId || '' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'prix'] })
      toast.success('Prix supprimé.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Prix récents (pour modération)
  const { data: prixData, isLoading: prixLoading } = useQuery({
    queryKey: ['admin', 'prix'],
    queryFn: () =>
      apiCall('/api/v1/prix?limite=20', {
        headers: { 'X-Telegram-Id': adminTelegramId || '' },
      }),
    enabled: !!adminTelegramId,
  })

  // Authentification locale
  if (!adminTelegramId) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-terra" />
            Authentification admin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Entrez votre identifiant Telegram (les admins sont whitelistés en base).
            Celui-ci sera stocké localement pour authentifier vos requêtes.
          </p>
          <div className="space-y-2">
            <Label htmlFor="telegramId">Votre Telegram ID</Label>
            <Input
              id="telegramId"
              placeholder="ex : 123456789"
              value={pretTelegramId}
              onChange={(e) => setPretTelegramId(e.target.value)}
            />
          </div>
          <Button
            onClick={() => {
              if (!pretTelegramId.trim()) {
                toast.error('Entrez un Telegram ID.')
                return
              }
              localStorage.setItem('adminTelegramId', pretTelegramId.trim())
              setAdminTelegramId(pretTelegramId.trim())
              setPretTelegramId('')
            }}
            className="w-full bg-terra text-terra-foreground hover:bg-terra/90"
          >
            Se connecter
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (agentsError) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="space-y-3 py-6 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-medium">Accès refusé</p>
          <p className="text-xs text-muted-foreground">
            Votre Telegram ID n'est pas enregistré comme administrateur. Demandez à l'admin principal de vous ajouter via la table Admin.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              localStorage.removeItem('adminTelegramId')
              setAdminTelegramId(null)
            }}
          >
            Changer d'identifiant
          </Button>
        </CardContent>
      </Card>
    )
  }

  const agents = agentsData?.data ?? []
  const prix = prixData?.data ?? []
  const stats = statsData?.data ?? { cetteSemaine: 0, parCommune: [] }

  return (
    <div className="space-y-8">
      {/* Stats rapides */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Prix collectés cette semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-terra">{stats.cetteSemaine}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Agents actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-jade">
              {agents.filter((a: any) => a.actif).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gestion agents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-terra" />
            Agents collecteurs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulaire d'ajout */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
            <div className="text-sm font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un agent
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="agent-tg" className="text-xs">Telegram ID</Label>
                <Input
                  id="agent-tg"
                  value={pretTelegramId}
                  onChange={(e) => setPretTelegramId(e.target.value)}
                  placeholder="123456789"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agent-nom" className="text-xs">Nom</Label>
                <Input
                  id="agent-nom"
                  value={pretNom}
                  onChange={(e) => setPretNom(e.target.value)}
                  placeholder="Jean Dupont"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Commune</Label>
                <Select value={pretCommune} onValueChange={setPretCommune}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {communesData?.data?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => addAgentMutation.mutate({
                telegramId: pretTelegramId.trim(),
                nom: pretNom.trim(),
                communeId: pretCommune,
              })}
              disabled={addAgentMutation.isPending || !pretTelegramId || !pretNom || !pretCommune}
              className="bg-terra text-terra-foreground hover:bg-terra/90"
              size="sm"
            >
              {addAgentMutation.isPending ? 'Ajout...' : 'Ajouter'}
            </Button>
          </div>

          {/* Table des agents */}
          {agentsLoading ? (
            <div className="text-sm text-muted-foreground">Chargement...</div>
          ) : agents.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun agent enregistré.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Telegram ID</TableHead>
                    <TableHead>Commune</TableHead>
                    <TableHead>Prix soumis</TableHead>
                    <TableHead className="text-right">Actif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.nom}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{a.telegramId}</TableCell>
                      <TableCell>{a.commune?.nom}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.prixSoumis}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={a.actif}
                          onCheckedChange={(checked) =>
                            toggleAgentMutation.mutate({ id: a.id, actif: checked })
                          }
                          disabled={toggleAgentMutation.isPending}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modération des prix récents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-safran" />
            Prix récents (modération)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prixLoading ? (
            <div className="text-sm text-muted-foreground">Chargement...</div>
          ) : prix.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun prix à afficher.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Marché</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prix.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.produit.nom}</TableCell>
                      <TableCell>{p.marche.nom}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={p.type === 'GROS' ? 'border-terra/30 text-terra' : 'border-jade/30 text-jade'}>
                          {p.type === 'GROS' ? 'Gros' : 'Détail'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{p.montant} {p.devise}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.dateCollecte).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Supprimer ce prix ? Cette action est irréversible.')) {
                              deletePrixMutation.mutate(p.id)
                            }
                          }}
                          disabled={deletePrixMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bouton déconnexion */}
      <div className="text-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            localStorage.removeItem('adminTelegramId')
            setAdminTelegramId(null)
          }}
        >
          Changer d'identifiant admin
        </Button>
      </div>
    </div>
  )
}
