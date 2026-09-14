import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/**
 * PATCH /api/v1/admin/marches/:id
 * Met à jour un marché. Body: { nom?, communeId? }
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

  const existing = await db.marche.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Marché introuvable.' }, { status: 404 })
  }

  if (body.communeId) {
    const commune = await db.commune.findUnique({ where: { id: body.communeId } })
    if (!commune) {
      return NextResponse.json({ error: 'Commune introuvable.' }, { status: 404 })
    }
  }

  const updated = await db.marche.update({
    where: { id },
    data: {
      nom: body.nom ?? existing.nom,
      communeId: body.communeId ?? existing.communeId,
    },
    include: { commune: true },
  })

  return NextResponse.json({
    message: 'Marché mis à jour avec succès.',
    data: {
      id: updated.id,
      nom: updated.nom,
      commune: { id: updated.commune.id, nom: updated.commune.nom },
    },
  })
}

/**
 * DELETE /api/v1/admin/marches/:id
 * Supprime un marché (cascade : supprime les prix associés).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const { id } = await params
  const existing = await db.marche.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Marché introuvable.' }, { status: 404 })
  }

  await db.marche.delete({ where: { id } })

  return NextResponse.json({
    message: 'Marché supprimé avec succès.',
    data: { id: existing.id, nom: existing.nom },
  })
}
