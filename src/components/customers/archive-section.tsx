'use client'

import { ChevronDown } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface ArchiveSectionProps {
  count: number
  children: ReactNode
}

// Eingeklappter Bereich «Archiv». Bei null Einträgen wird er nicht angezeigt.
export function ArchiveSection({ count, children }: ArchiveSectionProps) {
  const [open, setOpen] = useState(false)
  const contentId = useId()
  if (count === 0) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-3">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="-ml-3 gap-2" aria-controls={contentId}>
          <ChevronDown
            className={open ? 'h-4 w-4 rotate-180 transition-transform' : 'h-4 w-4 transition-transform'}
            aria-hidden="true"
          />
          Archiv ({count})
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent id={contentId} className="space-y-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
