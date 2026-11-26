export interface RepositoryOwner {
  login: string;
  avatar_url: string;
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: RepositoryOwner | null;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  forks_count: number;
  updated_at: string;
}

export interface SearchRepositoriesResponse {
  total_count: number;
  incomplete_results: boolean;
  items: Repository[];
}

export type SearchSort = 'stars' | 'forks' | 'help-wanted-issues' | 'updated';

export type SearchOrder = 'desc' | 'asc';

export interface RepositoryDetails {
  full_name: string;
  owner: RepositoryOwner | null;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  subscribers_count: number;
  open_issues_count: number;
  topics: string[];
  license: { name: string } | null;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
}

export type RepositoryLanguages = Record<string, number>;
