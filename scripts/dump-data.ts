import "dotenv/config";
import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const data = await prisma.calculations.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    console.log("LAST 5 RECORDS:");
    console.log(JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
