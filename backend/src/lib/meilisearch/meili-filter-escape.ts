export function escapeMeiliFilterValue(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}
