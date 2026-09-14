import Link from 'next/link'
import { Store } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-semibold text-terra">
              <Store className="h-5 w-5" />
              <span>PrixMarket</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Plateforme de consultation des prix de marché en Haïti. Données
              collectées par des agents locaux sur le terrain, mises à jour
              régulièrement.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-terra transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <Link href="/recherche" className="text-muted-foreground hover:text-terra transition-colors">
                  Recherche
                </Link>
              </li>
              <li>
                <Link href="/a-propos" className="text-muted-foreground hover:text-terra transition-colors">
                  À propos
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Communes actives</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/commune/Delmas" className="text-muted-foreground hover:text-terra transition-colors">
                  Delmas
                </Link>
              </li>
              <li className="text-muted-foreground/60 italic">
                Bientôt : Port-au-Prince, Pétion-Ville...
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border/40 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} PrixMarket — Données collectées sur le
          terrain par des agents locaux. Projet open-source MVP.
        </div>
      </div>
    </footer>
  )
}
