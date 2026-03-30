import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prisma: PrismaClient | undefined
}

// Lazy Proxy implementation to prevent PrismaClientInitializationError at startup
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop: string | symbol) {
    // 1. Check if database is configured
    if (!process.env.DATABASE_URL) {
      if (typeof prop === 'string' && ['then', 'catch', 'finally'].includes(prop)) return undefined;
      
      // Return a dummy model handler that doesn't crash on CRUD methods
      return new Proxy({}, {
        get() {
          return () => {
             console.warn(`⚠️ Prisma call to '${String(prop)}' ignored: DATABASE_URL is missing.`);
             return Promise.resolve(null);
          };
        }
      });
    }

    // 2. Database exists - handle singleton logic
    if (!globalThis.prisma) {
      try {
        globalThis.prisma = prismaClientSingleton();
      } catch (e) {
        console.error("❌ Failed to initialize PrismaClient:", e);
        // Fallback to dummy if construction still fails
        return new Proxy({}, { get: () => () => Promise.resolve(null) });
      }
    }
    
    const value = (globalThis.prisma as any)[prop];
    return typeof value === 'function' ? value.bind(globalThis.prisma) : value;
  }
});

export default prisma
