import 'server-only';
import { PrismaClient } from "@/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const prismaClientSingleton = () => {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 1 // Optimize for serverless transaction pooling
  })
  const adapter = new PrismaPg(pool)
  
  return new PrismaClient({ 
    adapter, 
    log: ["error", "warn"]
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma