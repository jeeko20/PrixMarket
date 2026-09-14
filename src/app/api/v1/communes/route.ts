import { db } from '@/lib/db'

/**
 * GET /api/v1/communes
 * Liste des communes (avec comptes associés pour l'accueil).
 */
export async function GET() {
  const communes = await db.commune.findMany({
    include: {
      _count: { select: { marches: true, agents: true } },
    },
    orderBy: { nom: 'asc' },
  })

  const result = communes.map((c) => ({
    id: c.id,
    nom: c.nom,
    marches: c._count.marches,
    agents: c._count.agents,
  }))

  return Response.json({ data: result, count: result.length })
}
