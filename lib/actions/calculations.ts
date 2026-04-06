"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveCalculation(payload: {
  project_name: string;
  inputs: any;
  results: any;
}) {
  if (!process.env.DATABASE_URL) {
    return { success: false, error: "DB_UNCONFIGURED" };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("Unauthenticated calculation save attempt");
      return { success: false, error: "Log in to save calculations." };
    }

    // Sanitize payload to handle NaN (not supported by JSON)
    const sanitize = (obj: any) => JSON.parse(JSON.stringify(obj, (key, value) => 
        typeof value === 'number' && isNaN(value) ? null : value
    ));

    const sanitizedInputs = sanitize(payload.inputs);
    const sanitizedResults = sanitize(payload.results);

    console.log("💾 SANITIZED DATA TO SAVE:", JSON.stringify({
      project_name: payload.project_name,
      inputs: sanitizedInputs,
      results: sanitizedResults,
      user_id: user.id
    }, null, 2));

    console.log("🧪 Payload Types (Sanitized):", {
      project_name: typeof payload.project_name,
      inputs: typeof sanitizedInputs,
      results: typeof sanitizedResults,
      user_id: typeof user.id
    });

    const calculation = await prisma.calculations.create({
      data: {
        user_id: user.id,
        project_name: payload.project_name || "חישוב ללא שם",
        inputs: sanitizedInputs,
        results: sanitizedResults,
      },
    });

    console.log(`✅ Calculation saved: ${calculation.id} for user ${user.id}`);
    
    revalidatePath("/history");
    return { success: true, id: calculation.id };
  } catch (error: any) {
    console.error("❌ Error saving calculation FULL ERROR:", error);
    console.error("❌ Prisma Error Code:", error.code);
    if (error.message?.includes("initialization") || error.message?.includes("connector")) {
      return { success: false, error: "DB_CONNECTION_ERROR" };
    }
    return { success: false, error: `נכשלה שמירת הנתונים: ${error.message}` };
  }
}

export async function getCalculations() {
  if (!process.env.DATABASE_URL) return [];
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const history = await prisma.calculations.findMany({
      where: { user_id: user.id },
      orderBy: { createdAt: 'desc' }
    });

    // Map to UI format
    return history.map(item => ({
      id: item.id,
      title: item.project_name || "חישוב ללא שם",
      project_name: item.project_name,
      createdAt: item.createdAt,
      inputs: item.inputs,
      results: item.results,
      userId: item.user_id
    }));
  } catch (error: any) {
    console.error("Error fetching calculations:", error.message);
    return [];
  }
}

export async function deleteCalculation(id: string) {
  if (!process.env.DATABASE_URL) return { success: false, error: "DB_UNCONFIGURED" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // IDOR Protection via 'where' clause including user_id
    await prisma.calculations.delete({
      where: {
        id,
        user_id: user.id
      }
    });

    revalidatePath("/history");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting calculation:", error.message);
    return { success: false, error: error.message };
  }
}

export async function getCalculationById(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const calculation = await prisma.calculations.findUnique({
      where: {
        id,
        user_id: user.id
      }
    });

    return calculation;
  } catch (error: any) {
    console.error("Error fetching calculation by ID:", error.message);
    return null;
  }
}
