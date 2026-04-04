import "dotenv/config";
import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function main() {
  console.log("🚀 Starting Prisma System Verification (v7 + Driver Adapter)...");
  
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter, log: ["error"] });

  try {
    // 1. Connection Check
    console.log("📡 Testing database connection...");
    await prisma.$connect();
    console.log("✅ Connection successful.");

    // 2. Schema Check
    console.log("📊 Checking 'calculations' table...");
    const count = await prisma.calculations.count();
    console.log(`✅ Table exists. Current record count: ${count}`);

    // 3. Data Integrity Check (Edge case: missing user)
    console.log("🔎 Fetching first available user for test...");
    const user = await prisma.users.findFirst();
    
    if (!user) {
      console.warn("⚠️ No users found in auth.users. Skipping write test.");
    } else {
      console.log(`👤 Using user: ${user.email} (${user.id})`);
      
      // 4. Write Test (The "Save to History" flow)
      console.log("✍️ Testing write operation (saveCalculation simulation)...");
      const testTitle = `VERIFICATION TEST ${new Date().toISOString()}`;
      const newCalc = await prisma.calculations.create({
        data: {
          user_id: user.id,
          project_name: testTitle,
          inputs: { test: true, val: 123 },
          results: { test: true, result: "OK" }
        }
      });
      console.log(`✅ Write successful. Record ID: ${newCalc.id}`);

      // 5. Read Test (The "History Page" flow)
      console.log("📖 Testing read operation...");
      const found = await prisma.calculations.findUnique({
        where: { id: newCalc.id }
      });
      
      if (found && found.project_name === testTitle) {
        console.log("✅ Read successful. Data matches.");
      } else {
        throw new Error("❌ Data mismatch or record not found!");
      }

      // 6. Cleanup
      console.log("🧹 Cleaning up test record...");
      await prisma.calculations.delete({
        where: { id: newCalc.id }
      });
      console.log("✅ Cleanup complete.");
    }

    console.log("\n✨ ALL PRISMA CHECKS PASSED SUCCESSFULLY! ✨");
  } catch (error: any) {
    console.error("\n❌ VERIFICATION FAILED!");
    console.error("Error Detail:", error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
