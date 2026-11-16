import type { Metadata } from 'next'
import { Suspense } from 'react'
import { WeekView } from '@/components/time-entries/week-view'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Woche',
}

// Die Woche steht in der Adresse (useSearchParams braucht eine Suspense-Grenze).
export default function WochePage() {
  return (
    <Suspense
      fallback={
        <div role="status" aria-label="Wird geladen" className="space-y-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      }
    >
      <WeekView />
    </Suspense>
  )
}
