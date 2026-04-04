"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveCalculation(payload: {
  title: string;
  inputs: any;
  outputs: any;
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

    const calculation = await prisma.calculations.create({
      data: {
        user_id: user.id,
        project_name: payload.title || "חישוב ללא שם",
        inputs: payload.inputs,
        results: payload.outputs,
      },
    });

    console.log(`✅ Calculation saved: ${calculation.id} for user ${user.id}`);
    
    revalidatePath("/history");
    return { success: true, id: calculation.id };
  } catch (error: any) {
    console.error("Error saving calculation:", error.message);
    if (error.message?.includes("initialization") || error.message?.includes("connector")) {
      return { success: false, error: "DB_CONNECTION_ERROR" };
    }
    return { success: false, error: "נכשלה שמירת הנתונים במערכת ההיסטוריה" };
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
      orderBy: { created_at: 'desc' }
    });

    // Map to UI format
    return history.map(item => ({
      id: item.id,
      title: item.project_name || "חישוב ללא שם",
      createdAt: item.created_at,
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
