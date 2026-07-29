export function formatInputNumber(raw: string): string {
  return raw.replace(/[^\d.,]/g, '').replace(',', '.');
}

export function parseAmount(raw: string): number | null {
  const cleaned = formatInputNumber(raw).trim();
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return value;
}
