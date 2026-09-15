import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/v1/produits?q=&categorie=
 * Liste des produits (recherche par nom partiel).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() || ''
  const categorie = searchParams.get('categorie')?.trim()

  const produits = await db.produit.findMany({
    where: {
      nom: q ? { contains: q } : undefined,
      categorie: categorie ? { equals: categorie } : undefined,
    },
    orderBy: { nom: 'asc' },
    take: 100,
  })

  return Response.json({
    data: produits,
    count: produits.length,
  })
}
