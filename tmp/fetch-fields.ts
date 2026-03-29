const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
    const envPath = path.join(process.cwd(), ".env.local");
    const content = fs.readFileSync(envPath, "utf8");
    const env = {};
    content.split("\n").forEach(line => {
        const [key, ...val] = line.split("=");
        if (key && val.length) {
            env[key.trim()] = val.join("=").trim().replace(/"/g, "");
        }
    });
    return env;
}

async function main() {
  const env = loadEnvLocal();
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const spreadsheetId = env.SPREADSHEET_ID;

  if (!email || !rawKey || !spreadsheetId) {
    console.error("Missing Google Sheets credentials in .env.local");
    return;
  }

  const jwt = new google.auth.JWT(
    email,
    undefined,
    rawKey,
    ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  );

  const sheets = google.sheets({ version: "v4", auth: jwt });

  try {
    // 1. Get the sheet titles first
    const spreadRes = await sheets.spreadsheets.get({ spreadsheetId });
    const titles = spreadRes.data.sheets.map(s => s.properties.title);
    console.log("Sheet Titles:", titles);

    const mainSheet = titles.includes("Main") ? "Main" : (titles.includes("Price Calculator") ? "Price Calculator" : titles[0]);

    // 2. Fetch the candidate rows from the detected main sheet
    const mainRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${mainSheet}!A1:D150`
    });
    
    if (mainRes.data.values) {
        const fields = mainRes.data.values.map((row, i) => ({
            rowIndex: i + 1,
            label: row[0] || "",
            value: row[1] || "",
            description: row[2] || "",
            hint: row[3] || ""
        })).filter(f => f.label && f.label !== "Title" && f.label !== "Label");
        
        console.log("EXTRACTED_FIELDS_START");
        console.log(JSON.stringify(fields, null, 2));
        console.log("EXTRACTED_FIELDS_END");
    }
  } catch (err) {
    console.error("Failed to fetch from sheets:", err.message);
  }
}

main();
