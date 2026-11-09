import Image from 'next/image'
import Link from 'next/link'
import logoCube from '@/assets/logo-cube.png'
import { cn } from '@/lib/utils'

interface BrandProps {
  className?: string
}

// Würfel-Logo mit dem Namen als Text. Der Name steht als echter Text daneben,
// daher ist das Bild selbst dekorativ (leerer Alternativtext).
export function Brand({ className }: BrandProps) {
  return (
    <Link
      href="/"
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-md font-bold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
    >
      <Image src={logoCube} alt="" width={28} height={32} priority />
      <span>Time Tracker Light</span>
    </Link>
  )
}
