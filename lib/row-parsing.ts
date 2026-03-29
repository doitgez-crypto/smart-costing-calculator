// Parsing utilities for Settings!B1/B2/B3.
// Supports numbers and ranges: "19-22, 25" => [19,20,21,22,25]

export function parseRowList(value: string | undefined | null): number[] {
  if (!value || typeof value !== 'string') return [];

  // Strict Validation: Only allow digits, commas, spaces, and valid dashes
  if (!/^[\d\s,\-–—]+$/.test(value)) {
    console.warn("Invalid row list format provided:", value);
    return [];
  }

  const normalized = value.replace(/[–—]/g, "-");
  const parts = normalized
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const result: number[] = [];
  const seen = new Set<number>();

  const pushUnique = (n: number) => {
    if (!Number.isFinite(n) || n <= 0) return;
    if (seen.has(n)) return;
    seen.add(n);
    result.push(n);
  };

  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const a = Number(rangeMatch[1]);
      const b = Number(rangeMatch[2]);
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      for (let i = start; i <= end; i++) pushUnique(i);
      continue;
    }

    const n = Number(part);
    pushUnique(n);
  }

  return result;
}

