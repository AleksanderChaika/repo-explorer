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
