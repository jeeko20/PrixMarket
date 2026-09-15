import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('Seed PrixMarket - demarrage...')

  // === 1. Communes ===
  const delmas = await db.commune.upsert({
    where: { nom: 'Delmas' },
    update: {},
    create: { nom: 'Delmas' },
  })
  console.log(`Commune creee : ${delmas.nom} (${delmas.id})`)

  // === 2. Marchés de Delmas ===
  const marcheCroixBossales = await db.marche.upsert({
    where: { id: 'marche-croix-bossales-delmas' },
    update: { communeId: delmas.id },
    create: {
      id: 'marche-croix-bossales-delmas',
      nom: 'Croix-des-Bossales',
      communeId: delmas.id,
    },
  })

  const marcheTabarre = await db.marche.upsert({
    where: { id: 'marche-tabarre-delmas' },
    update: { communeId: delmas.id },
    create: {
      id: 'marche-tabarre-delmas',
      nom: 'Tabarre',
      communeId: delmas.id,
    },
  })

  const marcheDelmas2 = await db.marche.upsert({
    where: { id: 'marche-delmas-2' },
    update: { communeId: delmas.id },
    create: {
      id: 'marche-delmas-2',
      nom: 'Marche Delmas 2',
      communeId: delmas.id,
    },
  })

  console.log('3 marches crees')

  // === 3. Produits courants ===
  const produitsData = [
    { nom: 'Riz importe', unite: 'sac 25kg', categorie: 'Cereales' },
    { nom: 'Riz local', unite: 'marmite', categorie: 'Cereales' },
    { nom: 'Haricot rouge', unite: 'marmite', categorie: 'Legumineuses' },
    { nom: 'Haricot blanc', unite: 'marmite', categorie: 'Legumineuses' },
    { nom: 'Mais', unite: 'marmite', categorie: 'Cereales' },
    { nom: 'Huile vegetale', unite: 'galon', categorie: 'Huiles' },
    { nom: 'Farine de ble', unite: 'sac 25kg', categorie: 'Farines' },
    { nom: 'Sucre', unite: 'lb', categorie: 'Sucre' },
    { nom: 'Poudre de tomate', unite: 'sachet', categorie: 'Epicerie' },
    { nom: 'Pates alimentaires', unite: 'paquet', categorie: 'Pates' },
    { nom: 'Sel', unite: 'lb', categorie: 'Epicerie' },
    { nom: 'Oeuf', unite: 'douzaine', categorie: 'Proteines' },
  ]

  const produits: Awaited<ReturnType<typeof db.produit.upsert>>[] = []
  for (const p of produitsData) {
    const produit = await db.produit.upsert({
      where: { nom: p.nom },
      update: { unite: p.unite, categorie: p.categorie },
      create: p,
    })
    produits.push(produit)
  }
  console.log(`${produits.length} produits crees`)

  // === 4. Agent de test ===
  const agent = await db.agent.upsert({
    where: { telegramId: '0' },
    update: { communeId: delmas.id, actif: true },
    create: {
      telegramId: '0',
      nom: 'Agent Test (Delmas)',
      communeId: delmas.id,
      actif: true,
    },
  })
  console.log(`Agent : ${agent.nom} (${agent.telegramId})`)

  // === 5. Quelques prix historiques ===
  const maintenant = Date.now()
  const unJour = 24 * 60 * 60 * 1000

  const prixData: Array<{
    produitIdx: number
    marcheId: string
    type: 'GROS' | 'DETAIL'
    montant: number
    joursAvant: number
  }> = [
    { produitIdx: 0, marcheId: marcheCroixBossales.id, type: 'GROS', montant: 3200, joursAvant: 0 },
    { produitIdx: 0, marcheId: marcheCroixBossales.id, type: 'DETAIL', montant: 145, joursAvant: 0 },
    { produitIdx: 0, marcheId: marcheCroixBossales.id, type: 'GROS', montant: 3150, joursAvant: 3 },
    { produitIdx: 0, marcheId: marcheCroixBossales.id, type: 'GROS', montant: 3100, joursAvant: 7 },
    { produitIdx: 0, marcheId: marcheCroixBossales.id, type: 'GROS', montant: 3050, joursAvant: 14 },
    { produitIdx: 0, marcheId: marcheTabarre.id, type: 'GROS', montant: 3250, joursAvant: 0 },
    { produitIdx: 0, marcheId: marcheTabarre.id, type: 'DETAIL', montant: 150, joursAvant: 0 },
    { produitIdx: 0, marcheId: marcheTabarre.id, type: 'GROS', montant: 3200, joursAvant: 7 },
    { produitIdx: 0, marcheId: marcheDelmas2.id, type: 'GROS', montant: 3300, joursAvant: 1 },
    { produitIdx: 0, marcheId: marcheDelmas2.id, type: 'DETAIL', montant: 148, joursAvant: 1 },

    { produitIdx: 2, marcheId: marcheCroixBossales.id, type: 'GROS', montant: 1850, joursAvant: 0 },
    { produitIdx: 2, marcheId: marcheCroixBossales.id, type: 'DETAIL', montant: 90, joursAvant: 0 },
    { produitIdx: 2, marcheId: marcheCroixBossales.id, type: 'GROS', montant: 1800, joursAvant: 5 },
    { produitIdx: 2, marcheId: marcheCroixBossales.id, type: 'GROS', montant: 1750, joursAvant: 12 },
    { produitIdx: 2, marcheId: marcheTabarre.id, type: 'GROS', montant: 1900, joursAvant: 1 },

    { produitIdx: 5, marcheId: marcheCroixBossales.id, type: 'GROS', montant: 750, joursAvant: 0 },
    { produitIdx: 5, marcheId: marcheCroixBossales.id, type: 'DETAIL', montant: 65, joursAvant: 0 },
    { produitIdx: 5, marcheId: marcheTabarre.id, type: 'GROS', montant: 760, joursAvant: 0 },
    { produitIdx: 5, marcheId: marcheDelmas2.id, type: 'DETAIL', montant: 68, joursAvant: 1 },

    { produitIdx: 6, marcheId: marcheCroixBossales.id, type: 'GROS', montant: 2750, joursAvant: 0 },
    { produitIdx: 6, marcheId: marcheCroixBossales.id, type: 'GROS', montant: 2700, joursAvant: 6 },
    { produitIdx: 6, marcheId: marcheTabarre.id, type: 'GROS', montant: 2800, joursAvant: 0 },

    { produitIdx: 7, marcheId: marcheCroixBossales.id, type: 'DETAIL', montant: 70, joursAvant: 0 },
    { produitIdx: 7, marcheId: marcheTabarre.id, type: 'DETAIL', montant: 72, joursAvant: 0 },

    { produitIdx: 4, marcheId: marcheCroixBossales.id, type: 'GROS', montant: 1100, joursAvant: 0 },
    { produitIdx: 4, marcheId: marcheCroixBossales.id, type: 'DETAIL', montant: 55, joursAvant: 0 },
    { produitIdx: 4, marcheId: marcheTabarre.id, type: 'GROS', montant: 1150, joursAvant: 2 },

    { produitIdx: 9, marcheId: marcheCroixBossales.id, type: 'GROS', montant: 950, joursAvant: 0 },
    { produitIdx: 9, marcheId: marcheDelmas2.id, type: 'DETAIL', montant: 50, joursAvant: 1 },
  ]

  for (const p of prixData) {
    await db.prix.create({
      data: {
        produitId: produits[p.produitIdx].id,
        marcheId: p.marcheId,
        agentId: agent.id,
        type: p.type,
        montant: p.montant,
        devise: 'HTG',
        dateCollecte: new Date(maintenant - p.joursAvant * unJour),
      },
    })
  }
  console.log(`${prixData.length} prix historiques inseres`)

  // === 6. Préférence utilisateur par défaut pour l'agent de test ===
  await db.userPreference.upsert({
    where: { telegramId: '0' },
    update: {},
    create: { telegramId: '0', langue: 'HT' },
  })

  console.log('\nSeed termine avec succes !')
}

main()
  .catch((e) => {
    console.error('Erreur de seed :', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
