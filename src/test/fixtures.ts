import type {
  Repository,
  RepositoryDetails,
  RepositoryLanguages,
  SearchRepositoriesResponse,
} from '@/api/types';

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

export function repositoryDetails(
  overrides: Partial<RepositoryDetails> = {},
): RepositoryDetails {
  return {
    full_name: 'owner/react',
    owner: { login: 'owner', avatar_url: 'https://example.test/avatar.png' },
    description: 'A UI library',
    html_url: 'https://github.com/owner/react',
    homepage: 'https://react.example.test',
    stargazers_count: 1200,
    forks_count: 340,
    subscribers_count: 56,
    open_issues_count: 7,
    topics: ['ui', 'library'],
    license: { name: 'MIT License' },
    default_branch: 'main',
    created_at: '2020-01-02T12:00:00Z',
    updated_at: '2021-03-04T12:00:00Z',
    pushed_at: '2022-05-06T12:00:00Z',
    ...overrides,
  };
}

export function languages(): RepositoryLanguages {
  return { TypeScript: 600, CSS: 300, HTML: 100 };
}
