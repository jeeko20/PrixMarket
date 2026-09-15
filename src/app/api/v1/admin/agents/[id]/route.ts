import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/**
 * PATCH /api/v1/admin/agents/:id
 * Active/désactive un agent. Body: { actif: boolean }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const { id } = await params

  const body = await req.json().catch(() => null)
  if (!body || typeof body.actif !== 'boolean') {
    return NextResponse.json(
      { error: 'Champ requis : actif (booléen).' },
      { status: 400 }
    )
  }

  const existing = await db.agent.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Agent introuvable.' }, { status: 404 })
  }

  const updated = await db.agent.update({
    where: { id },
    data: { actif: body.actif },
    include: { commune: true },
  })

  return NextResponse.json({
    message: `Agent ${body.actif ? 'activé' : 'désactivé'} avec succès.`,
    data: {
      id: updated.id,
      telegramId: updated.telegramId,
      nom: updated.nom,
      actif: updated.actif,
      commune: { id: updated.commune.id, nom: updated.commune.nom },
    },
  })
}
