import './globals.css'
import { Providers } from '@/components/providers'
export const metadata={title:'Boss e-business | CRM',description:'Sua operação comercial conectada',icons:{icon:'/favicon.svg'}}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR" suppressHydrationWarning><body><Providers>{children}</Providers></body></html>}
