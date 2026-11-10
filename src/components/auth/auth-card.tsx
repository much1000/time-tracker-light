import Image from 'next/image'
import type { ReactNode } from 'react'
import logoCube from '@/assets/logo-cube.png'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface AuthCardProps {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

// Gemeinsamer Rahmen der Anmeldeseiten: Logo, Überschrift, Inhalt, Fusszeile.
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center gap-4 text-center">
        <Image src={logoCube} alt="" width={48} height={55} priority />
        <div className="space-y-1.5">
          <CardTitle>
            <h1>{title}</h1>
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && <CardFooter className="justify-center">{footer}</CardFooter>}
    </Card>
  )
}
