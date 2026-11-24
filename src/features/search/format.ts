const countFormatter = new Intl.NumberFormat('en-US');

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

export function formatCount(value: number): string {
  return countFormatter.format(value);
}

export function formatDate(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return dateFormatter.format(date);
}
