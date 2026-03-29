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
    console.error("Missing credentials");
    return;
  }

  const jwt = new google.auth.JWT(email, undefined, rawKey, ["https://www.googleapis.com/auth/spreadsheets.readonly"]);
  const sheets = google.sheets({ version: "v4", auth: jwt });

  try {
    const spreadRes = await sheets.spreadsheets.get({ spreadsheetId });
    const titles = spreadRes.data.sheets.map(s => s.properties.title);
    const mainSheet = titles.includes("Main") ? "Main" : (titles.includes("Price Calculator") ? "Price Calculator" : titles[0]);

    // Fetch formulas instead of formatted output
    const mainRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${mainSheet}!B1:D150`,
      valueRenderOption: "FORMULA"
    });
    
    // Fetch values as well to compare
    const formattedRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${mainSheet}!B1:D150`,
      valueRenderOption: "FORMATTED_VALUE"
    });

    if (mainRes.data.values && formattedRes.data.values) {
        let output = "Row | Formula | Formatted Value | Label/Hint\n";
        output += "--------------------------------------------------\n";
        
        mainRes.data.values.forEach((row, idx) => {
            const rowIndex = idx + 1;
            const formula = row[0] || ""; // Column B is 0 index here
            const display = formattedRes.data.values[idx] ? (formattedRes.data.values[idx][0] || "") : "";
            const desc = row[2] || ""; // Column D is 2 index here
            
            if (formula && String(formula).startsWith('=')) {
                output += `${rowIndex} | ${formula} | ${display} | ${desc}\n`;
            }
        });
        
        const outputPath = path.join(process.cwd(), "tmp", "extracted_formulas.txt");
        fs.writeFileSync(outputPath, output);
        console.log("Extracted formulas to tmp/extracted_formulas.txt");
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();
