import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { CrmShell } from '@/components/crm/crm-shell'

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }
  return <CrmShell>{children}</CrmShell>
}
