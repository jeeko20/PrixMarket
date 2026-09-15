import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/**
 * PATCH /api/v1/admin/communes/:id
 * Renomme une commune. Body: { nom }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body || !body.nom) {
    return NextResponse.json({ error: 'Champ requis : nom.' }, { status: 400 })
  }

  const existing = await db.commune.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Commune introuvable.' }, { status: 404 })
  }

  const updated = await db.commune.update({
    where: { id },
    data: { nom: body.nom },
  })

  return NextResponse.json({
    message: 'Commune mise à jour avec succès.',
    data: updated,
  })
}

/**
 * DELETE /api/v1/admin/communes/:id
 * Supprime une commune (cascade : supprime ses marchés et les prix associés).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const { id } = await params
  const existing = await db.commune.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Commune introuvable.' }, { status: 404 })
  }

  await db.commune.delete({ where: { id } })

  return NextResponse.json({
    message: 'Commune supprimée avec succès.',
    data: { id: existing.id, nom: existing.nom },
  })
}
