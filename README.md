# smart-costing-calculator

## דרישות
* Node.js LTS (כולל `npm` ו-`npx`)
* גישת Service Account ל-Google Sheets

## משתני סביבה (`.env.local`)
בתוך התיקייה `smart-costing-calculator/` צור קובץ בשם `.env.local` עם:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SPREADSHEET_ID=...
```

הקוד שלנו ממיר את המחרוזת `\n` למעבר שורה בפועל.

## מבנה ה־Google Sheets (הנחות)
* לשונית `Settings`
  * `B1` = אינדקסי שורות קלט (מופרד בפסיקים)
  * `B2` = אינדקסי שורות פלט (מופרד בפסיקים)
  * `B3` = אינדקסי שורות קלט שהם אחוזים
* לשונית `Main`
  * קלטים: עמודות `A:B:C`
    * `A` תווית
    * `B` ערך (נכתב/נמחק ע"י המערכת)
    * `C` תיאור קטן מתחת לתווית ב־UI
  * פלטים: תווית בעמודה `A`, ותוצאת החישוב בעמודה `D` כברירת מחדל
    * אם אצלך התוצאה בעמודה אחרת, עדכן/י את `OUTPUT_VALUE_COLUMN` בקובץ `lib/google-sheets.ts`
* לשונית `History`
  * `A:D` = `Timestamp`, `User`, `Inputs`, `Results`

## הפעלה
לאחר התקנת Node.js:
1. `cd smart-costing-calculator`
2. `npm install`
3. `npm run dev`
