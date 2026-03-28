import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'

// We use a global singleton to avoid creating multiple connections in dev (HMR)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error('DATABASE_URL environment variable is not set')
  // Resolve relative file: URLs to absolute paths for libsql
  let url: string
  if (dbUrl.startsWith('file:./')) {
    url = 'file:' + path.resolve(process.cwd(), dbUrl.slice(7))
  } else if (dbUrl.startsWith('file:../')) {
    url = 'file:' + path.resolve(process.cwd(), dbUrl.slice(5))
  } else {
    url = dbUrl
  }
  const adapter = new PrismaLibSql({ url })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any)
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
