import type { Metadata } from "next";
import { getCalculations } from "@/app/actions";
import { HistoryClientView } from "./history-client";

export const metadata: Metadata = {
  title: "היסטוריית חישובים"
};

export const revalidate = 0;

export default async function HistoryPage() {
  let logs: any[] = [];
  try {
    logs = await getCalculations();
  } catch (e) {
    console.error(e);
  }

  return <HistoryClientView logs={logs} />;
}
