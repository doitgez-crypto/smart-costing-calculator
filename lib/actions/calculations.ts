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

    const calculation = await prisma.calculation.create({
      data: {
        userId: user.id,
        title: payload.title || "חישוב ללא שם",
        inputs: payload.inputs,
        outputs: payload.outputs,
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

    const history = await prisma.calculation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    return history;
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

    // IDOR Protection via 'where' clause including userId
    await prisma.calculation.delete({
      where: {
        id,
        userId: user.id
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

    const calculation = await prisma.calculation.findUnique({
      where: {
        id,
        userId: user.id
      }
    });

    return calculation;
  } catch (error: any) {
    console.error("Error fetching calculation by ID:", error.message);
    return null;
  }
}
