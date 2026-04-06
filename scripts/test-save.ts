import "dotenv/config";
import { saveCalculation } from "../lib/actions/calculations";
import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function main() {
  console.log("🧪 Simulating saveCalculation call...");
  
  // We need a mock user context, but saveCalculation uses createClient() from @supabase/ssr
  // which depends on cookies() and other Next.js headers that won't work in this script.
  
  // Instead, let's just test if Prisma can write with the EXACT keys we use in saveCalculation.
  
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const user = await prisma.users.findFirst();
    if (!user) throw new Error("No user found");

    const payload = {
      project_name: "TEST FROM SCRIPT",
      inputs: { "field_5": 100 },
      results: { "tax_19": 200 }
    };

    console.log("Write test...");
    const res = await prisma.calculations.create({
      data: {
        user_id: user.id,
        project_name: payload.project_name,
        inputs: payload.inputs,
        results: payload.results
      }
    });

    console.log("✅ Created record:", res.id);
    
    // Test mapping in getCalculations
    const record = await prisma.calculations.findUnique({ where: { id: res.id } });
    console.log("🔍 Read back record:", {
      project_name: record?.project_name,
      createdAt: record?.createdAt,
      inputs: record?.inputs,
      results: record?.results
    });

    await prisma.calculations.delete({ where: { id: res.id } });
    console.log("✨ Test complete.");

  } catch (e: any) {
    console.error("❌ TEST FAILED:", e.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
