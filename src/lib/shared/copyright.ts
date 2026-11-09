export function copyrightText(owner: string, since: number, year: number): string {
  const span = year > since ? `${since}–${year}` : String(since);
  return `© ${owner}, ${span}`;
}
