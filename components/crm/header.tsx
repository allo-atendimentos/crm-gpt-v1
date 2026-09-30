'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Search, Bell, LogOut, User as UserIcon, Sun, Moon, ChevronDown } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { clientApi } from '@/lib/client-api'

export function Header() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([])
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (q.length < 2) { setSearchResults([]); return }
    try {
      const data = await clientApi<any>(`/api/search?q=${encodeURIComponent(q)}`)
      setSearchResults(data?.results ?? [])
    } catch { setSearchResults([]) }
  }

  const initials = (session?.user?.name ?? 'U')
    .split(' ')
    .map((w: string) => w?.[0] ?? '')
    .join('')
    .toUpperCase()
    .substring(0, 2)

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6">
      {/* Search */}
      <div ref={searchRef} className="relative w-full max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            aria-label="Buscar contatos, negócios e empresas"
            placeholder="Buscar contatos, negócios, empresas..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {(searchResults?.length ?? 0) > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {searchResults.map((r: any, i: number) => (
              <button
                key={i}
                onClick={() => {
                  router.push(r?.href ?? '#')
                  setSearchResults([])
                  setSearchQuery('')
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 flex items-center gap-2"
              >
                <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {r?.type ?? ''}
                </span>
                <span className="truncate">{r?.label ?? ''}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>


        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#062a45] text-white flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium leading-none">{session?.user?.name ?? ''}</p>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">
                {session?.user?.tenantName ?? ''}
              </p>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground hidden md:block" />
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50">
              <button
                onClick={() => { setUserMenuOpen(false); router.push('/settings') }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2"
              >
                <UserIcon className="w-4 h-4" /> Meu Perfil
              </button>
              <hr className="border-border" />
              <button
                onClick={() => signOut({ redirectTo: '/login' })}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2 text-destructive"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
