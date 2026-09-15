import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'

/**
 * POST /api/v1/prix/submit
 * Soumission d'un nouveau prix par un agent.
 * Body JSON:
 *   { produitId, marcheId, type, montant, devise?, dateCollecte? }
 *
 * Règle : on n'UPDATE jamais un prix — on insère toujours une nouvelle ligne.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAgent(req)
  if (!authResult.ok) return authResult.response

  const body = await req.json().catch(() => null)
  if (!body) {
    return Response.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const { produitId, marcheId, type, montant, devise = 'HTG', dateCollecte } = body || {}

  // === Validation ===
  if (!produitId || !marcheId || !type || montant == null) {
    return Response.json(
      { error: 'Champs requis manquants : produitId, marcheId, type, montant.' },
      { status: 400 }
    )
  }

  const upperType = String(type).toUpperCase()
  if (upperType !== 'GROS' && upperType !== 'DETAIL') {
    return Response.json(
      { error: "type doit être 'GROS' ou 'DETAIL'." },
      { status: 400 }
    )
  }

  const montantNum = Number(montant)
  if (isNaN(montantNum) || montantNum < 0) {
    return Response.json(
      { error: 'montant doit être un nombre positif.' },
      { status: 400 }
    )
  }

  // Vérifie que le marché appartient bien à la commune de l'agent
  const agent = await db.agent.findUnique({
    where: { id: authResult.auth.agentId },
    include: { commune: true },
  })
  if (!agent) {
    return Response.json({ error: 'Agent introuvable.' }, { status: 404 })
  }

  const marche = await db.marche.findUnique({
    where: { id: marcheId },
    include: { commune: true },
  })
  if (!marche) {
    return Response.json({ error: 'Marché introuvable.' }, { status: 404 })
  }
  if (marche.communeId !== agent.communeId) {
    return Response.json(
      {
        error: `Ce marché est hors de votre commune (${agent.commune.nom}). Vous ne pouvez soumettre des prix que pour ${agent.commune.nom}.`,
      },
      { status: 403 }
    )
  }

  // Vérifie que le produit existe
  const produit = await db.produit.findUnique({ where: { id: produitId } })
  if (!produit) {
    return Response.json({ error: 'Produit introuvable.' }, { status: 404 })
  }

  // === Insertion ===
  const nouveauPrix = await db.prix.create({
    data: {
      produitId,
      marcheId,
      agentId: agent.id,
      type: upperType,
      montant: montantNum,
      devise,
      dateCollecte: dateCollecte ? new Date(dateCollecte) : new Date(),
    },
    include: {
      produit: true,
      marche: { include: { commune: true } },
    },
  })

  return Response.json(
    {
      message: 'Prix enregistré avec succès.',
      data: {
        id: nouveauPrix.id,
        montant: nouveauPrix.montant,
        devise: nouveauPrix.devise,
        type: nouveauPrix.type,
        dateCollecte: nouveauPrix.dateCollecte,
        produit: { id: nouveauPrix.produit.id, nom: nouveauPrix.produit.nom },
        marche: {
          id: nouveauPrix.marche.id,
          nom: nouveauPrix.marche.nom,
          commune: { id: nouveauPrix.marche.commune.id, nom: nouveauPrix.marche.commune.nom },
        },
      },
    },
    { status: 201 }
  )
}
