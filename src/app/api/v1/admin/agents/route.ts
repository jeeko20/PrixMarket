import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/**
 * GET /api/v1/admin/agents
 * Liste tous les agents.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const agents = await db.agent.findMany({
    include: { commune: true, _count: { select: { prix: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const result = agents.map((a) => ({
    id: a.id,
    telegramId: a.telegramId,
    nom: a.nom,
    actif: a.actif,
    createdAt: a.createdAt,
    commune: { id: a.commune.id, nom: a.commune.nom },
    prixSoumis: a._count.prix,
  }))

  return Response.json({ data: result, count: result.length })
}

/**
 * POST /api/v1/admin/agents
 * Ajoute un nouvel agent.
 * Body: { telegramId, nom, communeId }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => null)
  if (!body) {
    return Response.json({ error: 'Corps invalide.' }, { status: 400 })
  }

  const { telegramId, nom, communeId } = body || {}

  if (!telegramId || !nom || !communeId) {
    return Response.json(
      { error: 'Champs requis : telegramId, nom, communeId.' },
      { status: 400 }
    )
  }

  const commune = await db.commune.findUnique({ where: { id: communeId } })
  if (!commune) {
    return Response.json({ error: 'Commune introuvable.' }, { status: 404 })
  }

  // Vérifie qu'un agent (ou admin) n'existe pas déjà avec ce telegramId
  const existing = await db.agent.findUnique({ where: { telegramId: String(telegramId) } })
  if (existing) {
    return Response.json(
      { error: 'Un agent avec ce telegramId existe déjà.' },
      { status: 409 }
    )
  }

  const agent = await db.agent.create({
    data: { telegramId: String(telegramId), nom, communeId, actif: true },
    include: { commune: true },
  })

  return Response.json(
    {
      message: 'Agent créé avec succès.',
      data: {
        id: agent.id,
        telegramId: agent.telegramId,
        nom: agent.nom,
        actif: agent.actif,
        commune: { id: agent.commune.id, nom: agent.commune.nom },
        createdAt: agent.createdAt,
      },
    },
    { status: 201 }
  )
}
