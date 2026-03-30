"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Logs security-related events to the server console.
 * Only logs minimal non-sensitive data as per security best practices.
 */
export async function logSecurityEvent(event: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const timestamp = new Date().toISOString();
    const userEmail = user?.email || "Anonymous/Not Logged In";

    // Standardized log format: [TIMESTAMP] [EVENT_TYPE] [USER_EMAIL]
    console.warn(`[SECURITY_EVENT] [${timestamp}] [${event}] [User: ${userEmail}]`);

    // In a production environment, you would log this to a database or a specialized logging service like Sentry or Datadog.
    return { success: true };
  } catch (error) {
    console.error("Failed to log security event:", error);
    return { success: false };
  }
}
