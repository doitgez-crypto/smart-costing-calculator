"use server";

import { google } from "googleapis";
import { parseRowList } from "@/lib/row-parsing";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// שמות לשוניות בגיליון (אפשר לעקוף עם env אם אצלך השם שונה)
const DEFAULT_SHEET_MAIN = "Main";
const DEFAULT_SHEET_SETTINGS = "Settings";
const DEFAULT_SHEET_HISTORY = "History";

const REQUESTED_SHEET_MAIN =
  process.env.GOOGLE_SHEET_MAIN_NAME || DEFAULT_SHEET_MAIN;
const REQUESTED_SHEET_SETTINGS =
  process.env.GOOGLE_SHEET_SETTINGS_NAME || DEFAULT_SHEET_SETTINGS;
const REQUESTED_SHEET_HISTORY =
  process.env.GOOGLE_SHEET_HISTORY_NAME || DEFAULT_SHEET_HISTORY;

// הנחת ברירת מחדל: תוצאת Output נמצאת בעמודה D בגיליון Main.
// אם אצלך התוצאה בעמודה אחרת, עדכן כאן בלבד.
const OUTPUT_VALUE_COLUMN = "D";

function normalizeEnvValue(value: string): string {
  // dotenv usually strips quotes, but when copying/pasting it's easy to end up
  // with leading/trailing quotes as part of the value.
  return value.replace(/^"+/, "").replace(/"+$/, "").trim();
}

function normalizePrivateKey(rawKey: string): string {
  let privateKey = rawKey.trim();
  privateKey = normalizeEnvValue(privateKey);

  // Handle multiple possible representations:
  // - "\n" (two characters) from env/json
  // - "\\n" (double-escaped) depending on how it was pasted
  // - optional "\r\n"
  privateKey = privateKey
    .replace(/\\\\n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n");

  // Quick sanity check (helps diagnose PEM formatting issues).
  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      "GOOGLE_PRIVATE_KEY does not look like a valid PEM. Check that you copied the full key and used \\n for newlines."
    );
  }

  return privateKey;
}

function quoteSheetName(sheetName: string): string {
  // Google Sheets A1 notation: quoting is only necessary when the sheet name contains
  // spaces/special characters. Some environments are stricter than others.
  const safe = /^[A-Za-z0-9_]+$/.test(sheetName);
  if (safe) return sheetName;

  const escaped = sheetName.replace(/'/g, "''");
  return `'${escaped}'`;
}

function sheetRange(sheetName: string, a1Range: string): string {
  return `${quoteSheetName(sheetName)}!${a1Range}`;
}

function normalizeTitleForMatch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "");
}

function scoreTitleMatch(candidate: string, requested: string): number {
  const a = normalizeTitleForMatch(candidate);
  const b = normalizeTitleForMatch(requested);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.startsWith(b)) return 80;
  if (a.includes(b)) return 70;
  if (b.startsWith(a)) return 60;
  return 0;
}

type ResolvedSheets = {
  main: string;
  settings: string;
  history: string;
};

let resolvedCache:
  | (ResolvedSheets & { spreadsheetId: string; ts: number })
  | undefined;

async function resolveSheetTitles(
  sheets: ReturnType<typeof sheetsClient>["sheets"],
  spreadsheetId: string
): Promise<ResolvedSheets> {
  const now = Date.now();
  if (
    resolvedCache &&
    resolvedCache.spreadsheetId === spreadsheetId &&
    now - resolvedCache.ts < 10 * 60 * 1000
  ) {
    return {
      main: resolvedCache.main,
      settings: resolvedCache.settings,
      history: resolvedCache.history
    };
  }

  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title"
  });

  const titles = (res.data.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t));

  const chooseBest = (requested: string) => {
    let best = requested;
    let bestScore = -1;
    for (const t of titles) {
      const sc = scoreTitleMatch(t, requested);
      if (sc > bestScore) {
        bestScore = sc;
        best = t;
      }
    }
    return best;
  };

  const resolved: ResolvedSheets = {
    main: chooseBest(REQUESTED_SHEET_MAIN),
    settings: chooseBest(REQUESTED_SHEET_SETTINGS),
    history: chooseBest(REQUESTED_SHEET_HISTORY)
  };

  resolvedCache = { spreadsheetId, ts: now, ...resolved };
  return resolved;
}

async function assertSheetAccessible(
  sheets: ReturnType<typeof sheetsClient>["sheets"],
  spreadsheetId: string,
  sheetTitle: string
) {
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetRange(sheetTitle, "A1")
    });
  } catch {
    throw new Error(
      `Unable to access sheet '${sheetTitle}'. ` +
        `Check the tab name in Google Sheets (or set GOOGLE_SHEET_MAIN_NAME / GOOGLE_SHEET_SETTINGS_NAME / GOOGLE_SHEET_HISTORY_NAME).`
    );
  }
}

export type InputRow = {
  rowIndex: number;
  label: string;
  value: string; // לתצוגה בלבד (ב-% כבר הומר לאחוזים)
  description: string;
  isPercentage: boolean;
};

export type OutputRow = {
  rowIndex: number;
  label: string;
  value: string;
};

export type SettingsConfig = {
  inputRows: number[];
  outputRows: number[];
  percentageRows: number[];
};

type SheetsAuth = {
  jwt: ReturnType<typeof google.auth.JWT>;
  spreadsheetId: string;
};

function getAuthClient(): SheetsAuth {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.SPREADSHEET_ID;

  if (!email || !rawKey || !spreadsheetId) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY / SPREADSHEET_ID"
    );
  }

  const normalizedEmail = normalizeEnvValue(email);
  const normalizedSpreadsheetId = normalizeEnvValue(spreadsheetId);
  const privateKey = normalizePrivateKey(rawKey);

  const jwt = new google.auth.JWT(
    normalizedEmail,
    undefined,
    privateKey,
    SCOPES
  );
  return { jwt, spreadsheetId: normalizedSpreadsheetId };
}

// parseRowList is imported from `lib/row-parsing.ts`

function parseMaybeNumber(value: string | undefined | null): number | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function numberToCleanString(n: number): string {
  if (!Number.isFinite(n)) return "";
  // toString can be enough; Sheets accepts numeric-like strings
  return n.toString();
}

function sheetsClient() {
  const { jwt, spreadsheetId } = getAuthClient();
  return { jwt, spreadsheetId, sheets: google.sheets({ version: "v4", auth: jwt }) };
}

export async function getSettingsConfig(): Promise<SettingsConfig> {
  const { spreadsheetId, sheets } = sheetsClient();

  const { settings } = await resolveSheetTitles(sheets, spreadsheetId);
  await assertSheetAccessible(sheets, spreadsheetId, settings);

  // חיווי מוקדם שטווח הבסיס תקין לפני batchGet (מונע שגיאות "Unable to parse range").
  await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange(settings, "B1")
  });

  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: [
      sheetRange(settings, "B1"),
      sheetRange(settings, "B2"),
      sheetRange(settings, "B3")
    ]
  });

  const valueRanges = res.data.valueRanges ?? [];
  const getCell = (index: number) =>
    valueRanges[index]?.values?.[0]?.[0]?.toString();

  const inputRows = parseRowList(getCell(0));
  const outputRows = parseRowList(getCell(1));
  const percentageRows = parseRowList(getCell(2));

  return { inputRows, outputRows, percentageRows };
}

export async function saveSettingsConfig(
  config: SettingsConfig
): Promise<void> {
  const { spreadsheetId, sheets } = sheetsClient();

  const { settings } = await resolveSheetTitles(sheets, spreadsheetId);
  await assertSheetAccessible(sheets, spreadsheetId, settings);

  const formatList = (arr: number[]) =>
    arr.filter((n) => Number.isFinite(n) && n > 0).join(",");

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        {
          range: sheetRange(settings, "B1"),
          values: [[formatList(config.inputRows)]]
        },
        {
          range: sheetRange(settings, "B2"),
          values: [[formatList(config.outputRows)]]
        },
        {
          range: sheetRange(settings, "B3"),
          values: [[formatList(config.percentageRows)]]
        }
      ]
    }
  });
}

export async function getDynamicInputsAndOutputs(): Promise<{
  settings: SettingsConfig;
  inputs: InputRow[];
  outputs: OutputRow[];
}> {
  const settings = await getSettingsConfig();
  const { spreadsheetId, sheets } = sheetsClient();

  const { main } = await resolveSheetTitles(sheets, spreadsheetId);
  await assertSheetAccessible(sheets, spreadsheetId, main);

  const inputRanges = settings.inputRows.map(
    (r) => sheetRange(main, `A${r}:C${r}`)
  );

  const valueColumnIndex = OUTPUT_VALUE_COLUMN === "D" ? 3 : 0; // only D is expected here
  const outputRanges = settings.outputRows.map(
    (r) => sheetRange(main, `A${r}:${OUTPUT_VALUE_COLUMN}${r}`)
  );

  const ranges = [...inputRanges, ...outputRanges];
  if (ranges.length === 0) {
    return { settings, inputs: [], outputs: [] };
  }

  // בדיקת קיום/תקינות טווח ראשוני לפני שליפה בכמות גדולה.
  await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: ranges[0]
  });

  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges
  });

  const values = res.data.valueRanges ?? [];

  const inputs: InputRow[] = settings.inputRows.map((rowIndex, i) => {
    const rowValues = values[i]?.values?.[0] ?? [];
    const [labelRaw = "", valueRaw = "", descriptionRaw = ""] = rowValues as (
      | string
      | number
      | boolean
      | null
      | undefined
    )[];

    const isPercentage = settings.percentageRows.includes(rowIndex);
    const rawNumber = parseMaybeNumber(String(valueRaw));
    const displayValue = isPercentage && rawNumber !== null ? numberToCleanString(rawNumber * 100) : String(valueRaw);

    return {
      rowIndex,
      label: String(labelRaw),
      value: displayValue,
      description: String(descriptionRaw),
      isPercentage
    };
  });

  const outputs: OutputRow[] = settings.outputRows.map((rowIndex, j) => {
    const base = settings.inputRows.length;
    const rowValues = values[base + j]?.values?.[0] ?? [];
    const [labelRaw = ""] = rowValues as (string | number | boolean | null | undefined)[];
    const valueRaw = (rowValues as any[])[valueColumnIndex];
    return {
      rowIndex,
      label: String(labelRaw),
      value: valueRaw === undefined || valueRaw === null ? "" : String(valueRaw)
    };
  });

  return { settings, inputs, outputs };
}

export type CalculationInput = {
  rowIndex: number;
  value: string; // for % rows: user enters "25" meaning 25%
  isPercentage: boolean;
};

export async function calculateAndLogOnSheet(params: {
  userName: string;
  inputs: CalculationInput[];
}): Promise<{ outputs: OutputRow[] }> {
  const { userName, inputs } = params;
  if (!userName.trim()) throw new Error("User name is required");

  const { spreadsheetId, sheets } = sheetsClient();

  const { main, history } = await resolveSheetTitles(sheets, spreadsheetId);
  await assertSheetAccessible(sheets, spreadsheetId, main);
  await assertSheetAccessible(sheets, spreadsheetId, history);

  // 1) Write inputs to Column B (Main sheet)
  const writeData = inputs.map((input) => {
    let normalized = input.value?.toString() ?? "";
    if (input.isPercentage) {
      const percent = parseMaybeNumber(normalized);
      normalized = percent === null ? "" : numberToCleanString(percent / 100);
    }

    return {
      range: sheetRange(main, `B${input.rowIndex}`),
      values: [[normalized]]
    };
  });

  if (writeData.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: writeData
      }
    });
  }

  // 2) Enforce 850ms delay
  await new Promise((r) => setTimeout(r, 850));

  // 3) Read results
  const settings = await getSettingsConfig();
  const valueColumnIndex = OUTPUT_VALUE_COLUMN === "D" ? 3 : 0;
  const outputRanges = settings.outputRows.map(
    (r) => sheetRange(main, `A${r}:${OUTPUT_VALUE_COLUMN}${r}`)
  );

  const outputsRes = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: outputRanges
  });

  const outputValues = outputsRes.data.valueRanges ?? [];
  const outputs: OutputRow[] = settings.outputRows.map((rowIndex, idx) => {
    const rowValues = outputValues[idx]?.values?.[0] ?? [];
    const [labelRaw = ""] = rowValues as (string | number | boolean | null | undefined)[];
    const valueRaw = (rowValues as any[])[valueColumnIndex];
    return {
      rowIndex,
      label: String(labelRaw),
      value: valueRaw === undefined || valueRaw === null ? "" : String(valueRaw)
    };
  });

  // 4) Log to History sheet
  const timestamp = new Date().toISOString();
  const inputsForLog = inputs.map((i) => ({
    rowIndex: i.rowIndex,
    value: i.value,
    isPercentage: i.isPercentage
  }));
  const resultsForLog = outputs.map((o) => ({
    rowIndex: o.rowIndex,
    label: o.label,
    value: o.value
  }));

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: sheetRange(history, "A:D"),
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[timestamp, userName, JSON.stringify(inputsForLog), JSON.stringify(resultsForLog)]]
    }
  });

  // 5) Clear inputs in Column B
  if (inputs.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: inputs.map((i) => ({
          range: sheetRange(main, `B${i.rowIndex}`),
          values: [[""]]
        }))
      }
    });
  }

  return { outputs };
}

