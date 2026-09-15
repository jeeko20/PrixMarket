import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/**
 * GET /api/v1/admin/stats
 * Statistiques d'usage : nombre de prix cette semaine + par commune.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const uneSemaineAgo = new Date()
  uneSemaineAgo.setDate(uneSemaineAgo.getDate() - 7)

  const [cetteSemaine, parCommuneRows] = await Promise.all([
    db.prix.count({
      where: { dateCollecte: { gte: uneSemaineAgo } },
    }),
    db.prix.groupBy({
      by: ['marcheId'],
      where: { dateCollecte: { gte: uneSemaineAgo } },
      _count: { _all: true },
    }),
  ])

  // Enrichit parCommune avec le nom de la commune via les marchés
  const marcheIds = parCommuneRows.map((r) => r.marcheId)
  const marches = await db.marche.findMany({
    where: { id: { in: marcheIds } },
    include: { commune: true },
  })
  const marchéParId = new Map(marches.map((m) => [m.id, m]))

  // Agrège par commune
  const parCommuneMap = new Map<string, number>()
  for (const row of parCommuneRows) {
    const m = marchéParId.get(row.marcheId)
    if (!m) continue
    const cur = parCommuneMap.get(m.commune.nom) ?? 0
    parCommuneMap.set(m.commune.nom, cur + row._count._all)
  }

  const parCommune = Array.from(parCommuneMap.entries()).map(([commune, count]) => ({
    commune,
    count,
  }))

  return Response.json({
    data: { cetteSemaine, parCommune },
  })
}
