import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/**
 * DELETE /api/v1/admin/prix/:id
 * Supprime un prix suspect (modération admin).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const { id } = await params

  const existing = await db.prix.findUnique({
    where: { id },
    include: { produit: true, marche: { include: { commune: true } } },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Prix introuvable.' }, { status: 404 })
  }

  await db.prix.delete({ where: { id } })

  return NextResponse.json({
    message: 'Prix supprimé avec succès.',
    data: {
      id: existing.id,
      montant: existing.montant,
      devise: existing.devise,
      type: existing.type,
      produit: { id: existing.produit.id, nom: existing.produit.nom },
      marche: {
        id: existing.marche.id,
        nom: existing.marche.nom,
        commune: { id: existing.marche.commune.id, nom: existing.marche.commune.nom },
      },
    },
  })
}
