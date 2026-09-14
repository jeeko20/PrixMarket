/**
 * Authentification MVP — basée sur le telegramId (pas de mot de passe).
 * Les routes admin et POST /prix vérifient l'identité Telegram de l'appelant.
 */

import { db } from '@/lib/db'

export type Role = 'agent' | 'admin' | 'public'

export interface AuthResult {
  role: Role
  telegramId: string
  agentId?: string
  nom?: string
}

/**
 * Vérifie l'identité de l'appelant à partir d'un header X-Telegram-Id.
 * Retourne le rôle (agent / admin / public) et les infos associées.
 */
export async function authFromRequest(req: Request): Promise<AuthResult> {
  const telegramId = req.headers.get('x-telegram-id')?.trim() || ''

  if (!telegramId) {
    return { role: 'public', telegramId: '' }
  }

  // Vérifie d'abord si c'est un admin
  const admin = await db.admin.findUnique({
    where: { telegramId },
  })
  if (admin) {
    return { role: 'admin', telegramId, nom: admin.nom }
  }

  // Puis si c'est un agent actif
  const agent = await db.agent.findUnique({
    where: { telegramId },
  })
  if (agent) {
    return {
      role: agent.actif ? 'agent' : 'public',
      telegramId,
      agentId: agent.id,
      nom: agent.nom,
    }
  }

  // Telegram id inconnu → public
  return { role: 'public', telegramId }
}

/**
 * Vérifie que l'appelant est un agent actif. Sinon retourne une Response 401.
 */
export async function requireAgent(req: Request): Promise<{ ok: true; auth: AuthResult } | { ok: false; response: Response }> {
  const auth = await authFromRequest(req)
  if (auth.role !== 'agent' || !auth.agentId) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Accès refusé : vous devez être un agent enregistré et actif.' },
        { status: 401 }
      ),
    }
  }
  return { ok: true, auth }
}

/**
 * Vérifie que l'appelant est un admin. Sinon retourne une Response 401.
 */
export async function requireAdmin(req: Request): Promise<{ ok: true; auth: AuthResult } | { ok: false; response: Response }> {
  const auth = await authFromRequest(req)
  if (auth.role !== 'admin') {
    return {
      ok: false,
      response: Response.json(
        { error: 'Accès refusé : réservé aux administrateurs.' },
        { status: 401 }
      ),
    }
  }
  return { ok: true, auth }
}
