import { context } from '@/lib/context'
import { createHash } from 'node:crypto'
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db as prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const limitId='login:'+createHash('sha256').update(String(credentials.email).trim().toLowerCase()).digest('hex')+':'+Math.floor(Date.now()/900000)
        const rate=await prisma.rateLimit.upsert({where:{id:limitId},create:{id:limitId,expiresAt:new Date(Date.now()+900000)},update:{count:{increment:1}}})
        if(rate.count>20)return null
        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email).trim().toLowerCase() },
          include: { tenant: true },
        })
        if (!user || user.status !== 'active') return null
        const valid = await bcrypt.compare(credentials.password as string, user.password)
        if (!valid) return null
        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: user?.tenant?.name ?? '',
          tenantSlug: user?.tenant?.slug ?? '',
          passwordVersion: createHash('sha256').update(user.password).digest('hex'),
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.passwordVersion = user.passwordVersion
        token.id = user.id
        token.role = user.role
        token.tenantId = user.tenantId
        token.tenantName = user.tenantName
        token.tenantSlug = user.tenantSlug
      }
      return token
    },
    async session({ session, token }: any) {
      const current = await (context.getStore()?.tx ?? prisma).user.findUnique({ where: { id: token.id as string } })
      if (!current || current.status !== "active" || token.passwordVersion !== createHash("sha256").update(current.password).digest("hex")) return { ...session, user: undefined } as any
      token.role = current.role; token.tenantId = current.tenantId
      if (session?.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.tenantId = token.tenantId as string
        session.user.tenantName = token.tenantName as string
        session.user.tenantSlug = token.tenantSlug as string
      }
      return session
    },
  },
})
