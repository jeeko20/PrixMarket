import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/v1/prix/historique?produitId=&marcheId=
 * Historique complet d'un produit sur un marché, trié par date ASC pour graphique.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const produitId = searchParams.get('produitId')?.trim()
  const marcheId = searchParams.get('marcheId')?.trim()
  const typeParam = searchParams.get('type')?.trim().toUpperCase()
  const type = typeParam === 'GROS' || typeParam === 'DETAIL' ? typeParam : undefined

  if (!produitId || !marcheId) {
    return Response.json(
      { error: 'produitId et marcheId sont requis.' },
      { status: 400 }
    )
  }

  const prix = await db.prix.findMany({
    where: {
      produitId,
      marcheId,
      type: type ?? undefined,
    },
    include: {
      agent: true,
    },
    orderBy: { dateCollecte: 'asc' },
  })

  const result = prix.map((p) => ({
    id: p.id,
    montant: p.montant,
    devise: p.devise,
    type: p.type,
    dateCollecte: p.dateCollecte,
    agent: { id: p.agent.id, nom: p.agent.nom },
  }))

  return Response.json({ data: result, count: result.length })
}
