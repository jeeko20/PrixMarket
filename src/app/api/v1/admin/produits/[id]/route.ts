import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/**
 * PATCH /api/v1/admin/produits/:id
 * Met à jour un produit. Body: { nom?, unite?, categorie? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 })
  }

  const existing = await db.produit.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 })
  }

  const updated = await db.produit.update({
    where: { id },
    data: {
      nom: body.nom ?? existing.nom,
      unite: body.unite ?? existing.unite,
      categorie: body.categorie ?? existing.categorie,
    },
  })

  return NextResponse.json({
    message: 'Produit mis à jour avec succès.',
    data: updated,
  })
}

/**
 * DELETE /api/v1/admin/produits/:id
 * Supprime un produit (cascade : supprime aussi ses prix).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const { id } = await params

  const existing = await db.produit.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 })
  }

  await db.produit.delete({ where: { id } })

  return NextResponse.json({
    message: 'Produit supprimé avec succès.',
    data: { id: existing.id, nom: existing.nom },
  })
}
