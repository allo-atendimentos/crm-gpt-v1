import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (session?.user) {
    redirect('/dashboard')
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#062a45] via-[#1e3a5f] to-[#0f172a] p-4">
      {children}
    </div>
  )
}
