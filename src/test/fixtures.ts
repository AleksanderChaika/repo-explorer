import type { Repository, SearchRepositoriesResponse } from '@/api/types';

function hashString(value: string): number {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function repository(
  name: string,
  overrides: Partial<Repository> = {},
): Repository {
  const fullName = overrides.full_name ?? `owner/${name}`;
  return {
    id: hashString(fullName),
    name,
    full_name: fullName,
    owner: { login: 'owner', avatar_url: 'https://example.test/avatar.png' },
    html_url: `https://github.com/${fullName}`,
    description: null,
    stargazers_count: 1,
    language: null,
    forks_count: 0,
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function searchResponse(...names: string[]): SearchRepositoriesResponse {
  return {
    total_count: names.length,
    incomplete_results: false,
    items: names.map((name) => repository(name)),
  };
}
