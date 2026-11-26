import { getJson } from './client';
import { HttpError } from './errors';
import type { RepositoryDetails, RepositoryLanguages } from './types';

export function isValidRepositorySegment(value: string): boolean {
  return (
    value !== '' &&
    value !== '.' &&
    value !== '..' &&
    !value.includes('/') &&
    !value.includes('%')
  );
}

function repositoryPath(owner: string, name: string): string {
  if (!isValidRepositorySegment(owner) || !isValidRepositorySegment(name)) {
    throw new HttpError(404, 'Not Found');
  }
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

export async function getRepository(
  owner: string,
  name: string,
  signal?: AbortSignal,
): Promise<RepositoryDetails> {
  return getJson<RepositoryDetails>(repositoryPath(owner, name), { signal });
}

export async function getRepositoryLanguages(
  owner: string,
  name: string,
  signal?: AbortSignal,
): Promise<RepositoryLanguages> {
  return getJson<RepositoryLanguages>(
    `${repositoryPath(owner, name)}/languages`,
    { signal },
  );
}
