import Image from 'next/image'
import Link from 'next/link'
import logoCube from '@/assets/logo-cube.png'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// Platzhalter-Startseite. PROJ-6 (Timer) ersetzt den Inhalt; die Adresse bleibt.
export default function StartPage() {
  return (
    <Card>
      <CardHeader className="items-start gap-4">
        <Image src={logoCube} alt="" width={48} height={55} priority />
        <div className="space-y-1.5">
          <CardTitle>
            <h1>Willkommen bei Time Tracker Light</h1>
          </CardTitle>
          <CardDescription>
            Hier erfasst du bald deine Arbeitszeit pro Kunde und Projekt. Die
            App wird Schritt für Schritt ausgebaut.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/status">Systemstatus ansehen</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
