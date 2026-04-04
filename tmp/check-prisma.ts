import { PrismaClient } from '../generated/prisma';

async function main() {
  const prisma = new PrismaClient();
  console.log('--- Prisma Verification Start ---');
  try {
    console.log('Testing connection to public.calculations...');
    const count = await prisma.calculations.count();
    console.log(`✅ Success! Found ${count} records in calculations table.`);
    
    console.log('Testing connection to auth.users (via external table if configured)...');
    // Note: This might fail if the user doesn't have permissions or if it's not actually mapped
    try {
        const userCount = await prisma.users.count();
        console.log(`✅ Success! Found ${userCount} records in auth.users.`);
    } catch (e: any) {
        console.warn(`⚠️ Warning: Could not access auth.users: ${e.message}`);
    }

    console.log('--- Prisma Verification End ---');
  } catch (error: any) {
    console.error('❌ Prisma Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
