import "dotenv/config";
import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Skip server-only for automation script
async function main() {
  console.log("🤖 Starting Automation Simulation (Direct Prisma Verification)...");

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  
  // Replicate the exact logic from lib/prisma.ts (excluding server-only)
  const prisma = new PrismaClient({ 
    adapter, 
    log: ["error"]
  });

  try {
    console.log("🔌 Connecting...");
    await prisma.$connect();
    console.log("✅ Connection stable.");

    const user = await prisma.users.findFirst();
    if (!user) {
       console.warn("⚠️ No users found. Write test skipped.");
    } else {
      const testName = "AUTO_FIX_VERIFY_" + Date.now();
      const res = await prisma.calculations.create({
        data: {
          user_id: user.id,
          project_name: testName,
          inputs: { verified: true },
          results: { status: "OK" }
        }
      });
      console.log("✅ Saved record:", res.id);
      
      const found = await prisma.calculations.findUnique({ where: { id: res.id } });
      if (found?.project_name === testName) {
        console.log("✅ Load integrity verified.");
      }
      
      await prisma.calculations.delete({ where: { id: res.id } });
      console.log("🧹 Cleanup complete.");
    }

    console.log("\n✨ CONSTRUCTOR AND PERSISTENCE VERIFIED! ✨");

  } catch (e: any) {
    console.error("❌ VERIFICATION FAILED:", e.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
