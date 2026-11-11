import type { Metadata } from 'next'
import { CustomerDetail } from '@/components/customers/customer-detail'

// Der genaue Titel «<Kürzel> · Time Tracker Light» wird gesetzt, sobald der Kunde geladen ist.
export const metadata: Metadata = {
  title: 'Kunde',
}

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CustomerDetail customerId={id} />
}
