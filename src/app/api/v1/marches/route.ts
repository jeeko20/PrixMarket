import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/v1/marches?communeId=
 * Liste les marchés, optionnellement filtrés par commune.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const communeId = searchParams.get('communeId')?.trim()

  const marches = await db.marche.findMany({
    where: communeId ? { communeId } : undefined,
    include: { commune: true },
    orderBy: { nom: 'asc' },
  })

  const result = marches.map((m) => ({
    id: m.id,
    nom: m.nom,
    commune: { id: m.commune.id, nom: m.commune.nom },
  }))

  return Response.json({ data: result, count: result.length })
}
