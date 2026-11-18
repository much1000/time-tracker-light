import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MonthView } from '@/components/time-entries/month-view'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Monat',
}

// Der Monat steht in der Adresse (useSearchParams braucht eine Suspense-Grenze).
export default function MonatPage() {
  return (
    <Suspense
      fallback={
        <div role="status" aria-label="Wird geladen" className="space-y-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      }
    >
      <MonthView />
    </Suspense>
  )
}
