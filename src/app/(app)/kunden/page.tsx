import type { Metadata } from 'next'
import { CustomerList } from '@/components/customers/customer-list'

export const metadata: Metadata = {
  title: 'Kunden',
}

export default function CustomersPage() {
  return <CustomerList />
}
