import { AdminDashboard } from '@/components/prixmarket/AdminDashboard'
import { ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'Admin — PrixMarket',
  description: 'Tableau de bord administrateur : agents, modération, statistiques.',
}

export default function AdminPage() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-terra mb-2">
          <ShieldCheck className="h-4 w-4" />
          Administration
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
          Tableau de bord admin
        </h1>
        <p className="text-sm text-muted-foreground">
          Gérez les agents collecteurs, modérez les prix et consultez les
          statistiques d'usage. L'authentification se fait via votre
          identifiant Telegram (les admins sont whitelistés en base).
        </p>
      </div>
      <AdminDashboard />
    </div>
  )
}
