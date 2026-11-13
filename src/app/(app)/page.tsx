import { TimerSection } from '@/components/timer/timer-section'
import { TodayView } from '@/components/time-entries/today-view'

// Startseite: Timer, Zeit erfassen und heutige Einträge.
export default function StartPage() {
  return <TodayView timerSection={<TimerSection />} />
}
