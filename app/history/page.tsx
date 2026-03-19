import type { Metadata } from "next";
import { getHistoryLogs } from "@/lib/google-sheets";
import { HistoryClientView } from "./history-client";

export const metadata: Metadata = {
  title: "היסטוריית חישובים"
};

export const revalidate = 0;

export default async function HistoryPage() {
  let logs: any[] = [];
  try {
    logs = await getHistoryLogs();
    // Remove the very first row since it's likely the header row (timestamp, user, inputs, results)
    // Wait, let's just slice it if it looks like a header:
    if (logs.length > 0 && logs[logs.length - 1].timestamp === "Timestamp" || logs[logs.length - 1].timestamp.toLowerCase().includes("time")) {
      logs.pop(); // the header would be at the end because of .reverse()
    }
  } catch (e) {
    console.error(e);
  }

  return <HistoryClientView logs={logs} />;
}
