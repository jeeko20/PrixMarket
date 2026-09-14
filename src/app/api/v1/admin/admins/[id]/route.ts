import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/**
 * PATCH /api/v1/admin/admins/:id
 * Met à jour le nom d'un admin. Body: { nom }
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
    return NextResponse.json(
      { error: 'Champ requis : nom.' },
      { status: 400 }
    )
  }

  const existing = await db.admin.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Admin introuvable.' }, { status: 404 })
  }

  const updated = await db.admin.update({
    where: { id },
    data: { nom: body.nom },
  })

  return NextResponse.json({
    message: 'Admin mis à jour avec succès.',
    data: {
      id: updated.id,
      telegramId: updated.telegramId,
      nom: updated.nom,
    },
  })
}

/**
 * DELETE /api/v1/admin/admins/:id
 * Supprime un admin.
 * Règle de sécurité : on ne peut pas supprimer le dernier admin restant
 * (pour éviter de se lock-out).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const { id } = await params

  const existing = await db.admin.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Admin introuvable.' }, { status: 404 })
  }

  // Vérifie qu'il reste au moins un admin après suppression
  const totalAdmins = await db.admin.count()
  if (totalAdmins <= 1) {
    return NextResponse.json(
      { error: 'Impossible de supprimer le dernier admin. Ajoutez un autre admin d\'abord.' },
      { status: 400 }
    )
  }

  await db.admin.delete({ where: { id } })

  return NextResponse.json({
    message: 'Admin supprimé avec succès.',
    data: {
      id: existing.id,
      telegramId: existing.telegramId,
      nom: existing.nom,
    },
  })
}
