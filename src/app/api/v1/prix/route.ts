import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { parsePrixType } from '@/lib/prix-utils'

/**
 * GET /api/v1/prix
 * Params: produit (nom partiel), commune (nom), type (GROS|DETAIL), limite (def 50)
 * Retourne le DERNIER prix par (produit, marché, type).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const produit = searchParams.get('produit')?.trim()
  const commune = searchParams.get('commune')?.trim()
  const type = parsePrixType(searchParams.get('type'))
  const limiteRaw = parseInt(searchParams.get('limite') || '50', 10)
  const limite = Math.min(Math.max(isNaN(limiteRaw) ? 50 : limiteRaw, 1), 200)

  // Récupère tous les prix correspondant aux filtres, triés par date DESC
  const prix = await db.prix.findMany({
    where: {
      type: type ?? undefined,
      produit: produit
        ? { nom: { contains: produit } }
        : undefined,
      marche: commune
        ? { commune: { nom: { equals: commune } } }
        : undefined,
    },
    include: {
      produit: true,
      marche: { include: { commune: true } },
      agent: true,
    },
    orderBy: { dateCollecte: 'desc' },
    take: 500, // marge pour dédupliquer ensuite
  })

  // Déduplique : garde le plus récent par (produitId, marcheId, type)
  const vue = new Map<string, (typeof prix)[number]>()
  for (const p of prix) {
    const key = `${p.produitId}|${p.marcheId}|${p.type}`
    if (!vue.has(key)) vue.set(key, p)
  }

  const result = Array.from(vue.values())
    .slice(0, limite)
    .map((p) => ({
      id: p.id,
      montant: p.montant,
      devise: p.devise,
      type: p.type,
      dateCollecte: p.dateCollecte,
      produit: {
        id: p.produit.id,
        nom: p.produit.nom,
        unite: p.produit.unite,
        categorie: p.produit.categorie,
      },
      marche: {
        id: p.marche.id,
        nom: p.marche.nom,
        commune: { id: p.marche.commune.id, nom: p.marche.commune.nom },
      },
      agent: { id: p.agent.id, nom: p.agent.nom },
    }))

  return Response.json({ data: result, count: result.length })
}
