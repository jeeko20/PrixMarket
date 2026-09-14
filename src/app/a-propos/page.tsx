import Link from 'next/link'
import { Store, Send, MapPin, ShieldCheck, Users, Heart } from 'lucide-react'

export const metadata = {
  title: 'À propos — PrixMarket',
  description: 'Découvrez le projet PrixMarket, comment il fonctionne et comment devenir agent collecteur.',
}

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-12 max-w-3xl">
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-terra mb-2">
            <Store className="h-4 w-4" />
            À propos
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            PrixMarket, une plateforme citoyenne
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            PrixMarket est un projet indépendant qui vise à rendre les prix du
            marché haïtien transparents et accessibles à tous. Les données
            sont collectées sur le terrain par des agents locaux et mises à
            disposition gratuitement sur ce site et via notre bot Telegram.
          </p>
        </div>

        {/* Comment ça marche */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Comment ça marche</h2>
          <div className="space-y-4">
            {[
              {
                icon: Users,
                title: 'Des agents locaux collectent les prix',
                body: "Des commerçants, formateurs ou citoyens engagés parcourent les marchés de leur commune (Delmas pour commencer) et notent les prix en gros et au détail pratiqués par les vendeurs.",
              },
              {
                icon: Send,
                title: 'Iles envoient les données via Telegram',
                body: "Chaque agent dispose d'un compte Telegram validé. Il soumet ses relevés via une simple conversation avec notre bot — pas d'application à installer, pas de formulaire compliqué.",
              },
              {
                icon: MapPin,
                title: 'Les prix sont publiés ici',
                body: "Les prix collectés alimentent cette plateforme en temps réel. N'importe qui peut consulter, rechercher, comparer entre communes et marchés, et suivre l'évolution historique.",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/60 bg-card p-4 flex gap-4"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-terra/10 flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-terra" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Devenir agent */}
        <section className="rounded-xl border border-terra/30 bg-terra/5 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-terra" />
            <h2 className="text-xl font-semibold">Comment devenir agent collecteur ?</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Si vous résidez à Delmas (ou dans une future commune couverte), que
            vous avez l'habitude des marchés locaux et que vous souhaitez
            contribuer à la transparence des prix, vous pouvez devenir agent
            collecteur. Voici les étapes :
          </p>
          <ol className="space-y-2 text-sm text-foreground list-decimal pl-5">
            <li>Écrire à l'administrateur du bot Telegram pour demander à être ajouté.</li>
            <li>Fournir votre identifiant Telegram et votre nom.</li>
            <li>Indiquer votre commune (Delmas pour le MVP).</li>
            <li>Une fois validé, vous pourrez soumettre des prix via la commande <code className="px-1 py-0.5 bg-muted rounded text-xs">/soumettre</code>.</li>
          </ol>
          <p className="text-xs text-muted-foreground italic mt-2">
            La liste des agents est volontairement limitée au départ pour garantir la qualité des données.
          </p>
        </section>

        {/* Hors périmètre */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Ce qui n'est pas (encore) inclus</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Intégration WhatsApp (prévue en phase 2)</li>
            <li>Paiements en ligne</li>
            <li>Alertes de prix automatiques</li>
            <li>Application mobile native</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nous voulons d'abord valider l'utilité de la plateforme avant
            d'étendre les fonctionnalités. Si vous avez des idées ou
            remarques, n'hésitez pas à nous écrire.
          </p>
        </section>

        {/* CTA final */}
        <section className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
          <Heart className="h-6 w-6 text-terra mx-auto" />
          <h2 className="text-xl font-semibold">Construit avec et pour la communauté haïtienne</h2>
          <p className="text-sm text-muted-foreground">
            PrixMarket est un projet open-source MVP, hébergé de manière
            économique et pensé pour être facilement extensible à d'autres
            communes.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-terra text-terra-foreground px-4 py-2 text-sm font-medium hover:bg-terra/90 transition-colors mt-2"
          >
            Explorer les prix
          </Link>
        </section>
      </div>
    </div>
  )
}
