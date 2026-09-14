import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/**
 * POST /api/v1/admin/marches
 * Ajoute un nouveau marché.
 * Body: { nom, communeId }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => null)
  if (!body || !body.nom || !body.communeId) {
    return Response.json(
      { error: 'Champs requis : nom, communeId.' },
      { status: 400 }
    )
  }

  const commune = await db.commune.findUnique({ where: { id: body.communeId } })
  if (!commune) {
    return Response.json({ error: 'Commune introuvable.' }, { status: 404 })
  }

  const marche = await db.marche.create({
    data: { nom: body.nom, communeId: body.communeId },
    include: { commune: true },
  })

  return Response.json(
    {
      message: 'Marché créé avec succès.',
      data: {
        id: marche.id,
        nom: marche.nom,
        commune: { id: marche.commune.id, nom: marche.commune.nom },
      },
    },
    { status: 201 }
  )
}

/**
 * GET /api/v1/admin/marches
 * Liste tous les marchés.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const marches = await db.marche.findMany({
    include: {
      commune: true,
      _count: { select: { prix: true } },
    },
    orderBy: { nom: 'asc' },
  })

  const result = marches.map((m) => ({
    id: m.id,
    nom: m.nom,
    commune: { id: m.commune.id, nom: m.commune.nom },
    prixCount: m._count.prix,
  }))

  return Response.json({ data: result, count: result.length })
}
