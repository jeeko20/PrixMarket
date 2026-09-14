'use client'

import { useState, useTransition, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

/**
 * Barre de recherche proéminente — redirige vers /recherche?q=...
 */
export function SearchBar({
  defaultValue = '',
  size = 'default',
  autoFocus = false,
}: {
  defaultValue?: string
  size?: 'default' | 'lg'
  autoFocus?: boolean
}) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)
  const [isPending, startTransition] = useTransition()

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const q = value.trim()
    startTransition(() => {
      router.push(q ? `/recherche?q=${encodeURIComponent(q)}` : '/recherche')
    })
  }

  const sizeClasses =
    size === 'lg' ? 'h-14 text-base sm:text-lg' : 'h-11'

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Rechercher un produit (riz, haricot, huile...)"
            className={`${sizeClasses} pl-11 pr-4`}
            autoFocus={autoFocus}
            aria-label="Rechercher un produit"
          />
        </div>
        <Button
          type="submit"
          size={size === 'lg' ? 'lg' : 'default'}
          disabled={isPending}
          className="bg-terra text-terra-foreground hover:bg-terra/90"
        >
          Rechercher
        </Button>
      </div>
    </form>
  )
}
