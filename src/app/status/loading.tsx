import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function StatusLoading() {
  return (
    <main
      className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-8"
      aria-busy="true"
    >
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
          <span className="sr-only">Verbindung wird geprüft …</span>
        </CardContent>
      </Card>
    </main>
  )
}
