/** datetime-local 값 → API용 ISO UTC 문자열 */
export function localDateTimeToIso(value: string): string {
  return new Date(value).toISOString();
}

/** 출제 폼 기본 마감: 7일 후 23:59 (로컬) */
export function defaultDueAtLocal(daysAhead = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(23, 59, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO 마감일 표시 */
export function formatDueAt(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
