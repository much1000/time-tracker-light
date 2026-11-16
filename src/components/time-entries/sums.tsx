import { formatDuration } from '@/lib/time-entries/duration'

// Summenzeile «1:30 gearbeitet · 1:00 verrechenbar», gemeinsam für «Zeiten» und «Woche».
export function Sums({ worked, billable }: { worked: number; billable: number }) {
  return (
    <span className="tabular-nums">
      {formatDuration(worked)} gearbeitet · {formatDuration(billable)} verrechenbar
    </span>
  )
}
