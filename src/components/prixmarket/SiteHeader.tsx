import Link from 'next/link'
import { Store, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet'

const navItems = [
  { href: '/', label: 'Accueil' },
  { href: '/recherche', label: 'Rechercher' },
  { href: '/a-propos', label: 'À propos' },
  { href: '/admin', label: 'Admin' },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-terra hover:text-terra/80 transition-colors"
        >
          <Store className="h-6 w-6" />
          <span className="text-lg">PrixMarket</span>
          <span className="hidden sm:inline text-xs text-muted-foreground ml-1">
            Haïti
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 text-sm font-medium text-foreground/80 hover:text-terra transition-colors rounded-md hover:bg-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetTitle className="mb-4">Menu</SheetTitle>
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <SheetClose asChild key={item.href}>
                  <Link
                    href={item.href}
                    className="px-3 py-2 text-base font-medium text-foreground/80 hover:text-terra transition-colors rounded-md hover:bg-accent"
                  >
                    {item.label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
