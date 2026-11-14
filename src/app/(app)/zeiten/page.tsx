import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ZeitenView } from '@/components/time-entries/zeiten-view'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Zeiten',
}

// Monat und Filter stehen in der Adresse (useSearchParams braucht eine Suspense-Grenze).
export default function ZeitenPage() {
  return (
    <Suspense
      fallback={
        <div role="status" aria-label="Wird geladen" className="space-y-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      }
    >
      <ZeitenView />
    </Suspense>
  )
}
