import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/**
 * POST /api/v1/admin/communes
 * Ajoute une nouvelle commune.
 * Body: { nom }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => null)
  if (!body || !body.nom) {
    return Response.json({ error: 'Champ requis : nom.' }, { status: 400 })
  }

  const existing = await db.commune.findUnique({ where: { nom: body.nom } })
  if (existing) {
    return Response.json(
      { error: 'Une commune avec ce nom existe déjà.' },
      { status: 409 }
    )
  }

  const commune = await db.commune.create({ data: { nom: body.nom } })
  return Response.json(
    { message: 'Commune créée avec succès.', data: commune },
    { status: 201 }
  )
}

/**
 * GET /api/v1/admin/communes
 * Liste les communes (admin view avec compteurs).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const communes = await db.commune.findMany({
    include: {
      _count: {
        select: { marches: true, agents: true },
      },
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
