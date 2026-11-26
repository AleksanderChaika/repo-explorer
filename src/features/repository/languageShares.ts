import type { RepositoryLanguages } from '@/api/types';

const MAX_ROWS = 7;
const NAMED_BESIDE_OTHER = 6;

export interface LanguageShare {
  name: string;
  bytes: number;
  percent: string;
  isOther: boolean;
}

interface Row {
  name: string;
  bytes: number;
  isOther: boolean;
}

function toRows(languages: RepositoryLanguages): Row[] {
  const rows = Object.entries(languages)
    .filter(([, bytes]) => bytes > 0)
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
    .map(([name, bytes]) => ({ name, bytes, isOther: false }));

  if (rows.length <= MAX_ROWS) {
    return rows;
  }
  const rest = rows.slice(NAMED_BESIDE_OTHER);
  const bytes = rest.reduce((sum, row) => sum + row.bytes, 0);
  return [
    ...rows.slice(0, NAMED_BESIDE_OTHER),
    { name: 'Other', bytes, isOther: true },
  ];
}

export function languageShares(
  languages: RepositoryLanguages,
): LanguageShare[] {
  const rows = toRows(languages);
  const total = rows.reduce((sum, row) => sum + row.bytes, 0);
  const shares = rows.map((row) => ({
    ...row,
    isTiny: row.bytes * 1000 < total,
    tenths: Math.floor((row.bytes * 1000) / total),
    remainder: (row.bytes * 1000) % total,
  }));

  const visible = shares.filter((share) => !share.isTiny);
  const visibleBytes = visible.reduce((sum, share) => sum + share.bytes, 0);
  const target = Math.round((visibleBytes * 1000) / total);
  const floored = visible.reduce((sum, share) => sum + share.tenths, 0);
  [...visible]
    .sort((a, b) => b.remainder - a.remainder)
    .slice(0, target - floored)
    .forEach((share) => {
      share.tenths += 1;
    });

  return shares.map(({ name, bytes, isOther, isTiny, tenths }) => ({
    name,
    bytes,
    isOther,
    percent: isTiny ? '<0.1%' : `${(tenths / 10).toFixed(1)}%`,
  }));
}
