 'use client'
import {Sidebar} from './sidebar'
import {Header} from './header'
export function CrmShell({children}:{children:React.ReactNode}){return <div className="min-h-screen bg-background"><Sidebar/><div className="boss-workspace"><Header/><main className="p-5 md:p-8">{children}</main></div></div>}
