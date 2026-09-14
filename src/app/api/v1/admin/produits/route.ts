import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/**
 * POST /api/v1/admin/produits
 * Ajoute un nouveau produit.
 * Body: { nom, unite, categorie? }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => null)
  if (!body) return Response.json({ error: 'Corps invalide.' }, { status: 400 })

  const { nom, unite, categorie } = body || {}

  if (!nom || !unite) {
    return Response.json(
      { error: 'Champs requis : nom, unite.' },
      { status: 400 }
    )
  }

  // Vérifie l'unicité du nom
  const existing = await db.produit.findUnique({ where: { nom } })
  if (existing) {
    return Response.json(
      { error: 'Un produit avec ce nom existe déjà.' },
      { status: 409 }
    )
  }

  const produit = await db.produit.create({
    data: { nom, unite, categorie: categorie || null },
  })

  return Response.json(
    {
      message: 'Produit créé avec succès.',
      data: produit,
    },
    { status: 201 }
  )
}

/**
 * GET /api/v1/admin/produits
 * Liste tous les produits (admin view, avec plus de détails que l'endpoint public).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const produits = await db.produit.findMany({
    include: { _count: { select: { prix: true } } },
    orderBy: { nom: 'asc' },
  })

  const result = produits.map((p) => ({
    id: p.id,
    nom: p.nom,
    unite: p.unite,
    categorie: p.categorie,
    prixCount: p._count.prix,
  }))

  return Response.json({ data: result, count: result.length })
}
