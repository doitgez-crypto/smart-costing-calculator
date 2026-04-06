import "dotenv/config";
import { saveCalculation, getCalculations, getCalculationById } from "../lib/actions/calculations";
import prisma from "../lib/prisma";

async function main() {
  console.log("🤖 Starting Automation Simulation (Full Save/Load Cycle)...");

  try {
    // 1. Connection check
    console.log("🔌 Connecting to Prisma...");
    await prisma.$connect();
    console.log("✅ Connection stable.");

    // 2. Simulate Save Calculation
    // Note: In a real environment, saveCalculation uses supabase.auth.getUser()
    // Since we are running in a script, we'll test the Prisma logic directly.
    console.log("💾 Simulating Save operation...");
    
    // We need a test user. Let's find one.
    const user = await prisma.users.findFirst();
    if (!user) {
      console.warn("⚠️ No users found. Skipping automation write test.");
      return;
    }

    const testPayload = {
      project_name: "AUTOMATION_TEST_" + new Date().toISOString(),
      inputs: { "automation": true, "val": 42 },
      results: { "automation_result": "SUCCESS", "tax_19": 1500 }
    };

    // We simulate the prisma.create call directly because saveCalculation needs a session
    const newRecord = await prisma.calculations.create({
      data: {
        user_id: user.id || null,
        project_name: testPayload.project_name,
        inputs: testPayload.inputs,
        results: testPayload.results
      }
    });

    console.log("✅ Record created with ID:", newRecord.id);

    // 3. Simulate Load operation (Find by ID)
    console.log("🔍 Simulating Load operation by ID...");
    const loaded = await prisma.calculations.findUnique({
      where: { id: newRecord.id }
    });

    if (loaded && loaded.project_name === testPayload.project_name) {
      console.log("✅ Data integrity verified (project_name matched).");
      if (JSON.stringify(loaded.results) === JSON.stringify(testPayload.results)) {
         console.log("✅ Results JSON blob verified.");
      } else {
         throw new Error("❌ Results JSON data mismatch!");
      }
    } else {
      throw new Error("❌ Could not load or name mismatch!");
    }

    // 4. Cleanup
    console.log("🧹 Cleaning up automation test record...");
    await prisma.calculations.delete({
      where: { id: newRecord.id }
    });
    console.log("✅ Cleanup complete.");

    console.log("\n✨ AUTOMATION CYCLES COMPLETED SUCCESSFULLY! ✨");
    process.exit(0);

  } catch (error: any) {
    console.error("\n❌ AUTOMATION FAILED!");
    console.error("Error Detail:", error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
