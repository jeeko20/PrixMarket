import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/**
 * GET /api/v1/admin/admins
 * Liste tous les admins.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const admins = await db.admin.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const result = admins.map((a) => ({
    id: a.id,
    telegramId: a.telegramId,
    nom: a.nom,
    createdAt: a.createdAt,
  }))

  return Response.json({ data: result, count: result.length })
}

/**
 * POST /api/v1/admin/admins
 * Ajoute un nouvel admin.
 * Body: { telegramId, nom }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => null)
  if (!body) {
    return Response.json({ error: 'Corps invalide.' }, { status: 400 })
  }

  const { telegramId, nom } = body || {}

  if (!telegramId || !nom) {
    return Response.json(
      { error: 'Champs requis : telegramId, nom.' },
      { status: 400 }
    )
  }

  // Vérifie qu'un admin n'existe pas déjà avec ce telegramId
  const existing = await db.admin.findUnique({ where: { telegramId: String(telegramId) } })
  if (existing) {
    return Response.json(
      { error: 'Un admin avec ce telegramId existe déjà.' },
      { status: 409 }
    )
  }

  const admin = await db.admin.create({
    data: { telegramId: String(telegramId), nom },
  })

  return Response.json(
    {
      message: 'Admin créé avec succès.',
      data: {
        id: admin.id,
        telegramId: admin.telegramId,
        nom: admin.nom,
        createdAt: admin.createdAt,
      },
    },
    { status: 201 }
  )
}
