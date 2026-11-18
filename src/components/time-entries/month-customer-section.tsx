import { ChevronDown } from 'lucide-react'
import { ArchivedBadge, MonthEntryRow, MonthNumbers } from '@/components/time-entries/month-parts'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { MonthCustomer, MonthProject } from '@/lib/time-entries/month-summary'

interface MonthCustomerSectionProps {
  customer: MonthCustomer
  // Projekte (Kennung), die aufgeklappt sind
  openProjects: string[]
  onToggleProject: (projectId: string, open: boolean) => void
  zeitenHref: string
}

// Ein Kunde der Monatsauswertung: Kundensumme und je Projekt eine aufklappbare Zeile mit den Einträgen.
export function MonthCustomerSection({ customer, openProjects, onToggleProject, zeitenHref }: MonthCustomerSectionProps) {
  const headingId = `month-customer-${customer.customerId}`
  return (
    <section aria-labelledby={headingId}>
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <h3 id={headingId} className="flex flex-wrap items-center gap-2 text-lg font-semibold">
              <span className="min-w-0 [overflow-wrap:anywhere]">
                <span className="font-mono text-base text-muted-foreground">{customer.customerCode}</span>
                <span className="text-muted-foreground"> · </span>
                {customer.customerName}
              </span>
              {customer.customerArchived && <ArchivedBadge />}
            </h3>
            <MonthNumbers sums={customer} label={`Summe ${customer.customerName}`} />
          </div>
          <ul className="space-y-3">
            {customer.projects.map((project) => (
              <ProjectItem
                key={project.projectId}
                customer={customer}
                project={project}
                open={openProjects.includes(project.projectId)}
                onOpenChange={(open) => onToggleProject(project.projectId, open)}
                zeitenHref={zeitenHref}
              />
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  )
}

function ProjectItem({
  customer,
  project,
  open,
  onOpenChange,
  zeitenHref,
}: {
  customer: MonthCustomer
  project: MonthProject
  open: boolean
  onOpenChange: (open: boolean) => void
  zeitenHref: string
}) {
  const count = project.entries.length
  return (
    <li>
      <Collapsible open={open} onOpenChange={onOpenChange} className="rounded-lg border">
        <h4>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="group h-auto min-h-11 w-full justify-between gap-3 whitespace-normal px-3 py-2 text-left"
            >
              <span className="min-w-0 space-y-0.5">
                <span className="flex flex-wrap items-center gap-2 font-medium [overflow-wrap:anywhere]">
                  {project.projectName}
                  {(project.projectArchived || customer.customerArchived) && <ArchivedBadge />}
                </span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {count === 1 ? '1 Eintrag' : `${count} Einträge`}
                </span>
              </span>
              <ChevronDown
                className="shrink-0 transition-transform group-data-[state=open]:rotate-180"
                aria-hidden="true"
              />
            </Button>
          </CollapsibleTrigger>
        </h4>
        <div className="px-3 pb-3">
          <MonthNumbers sums={project} label={`Summe ${project.projectName}`} />
        </div>
        <CollapsibleContent>
          <ul className="space-y-2 border-t p-3">
            {project.entries.map((entry) => (
              <MonthEntryRow key={entry.id} entry={entry} zeitenHref={zeitenHref} />
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}
