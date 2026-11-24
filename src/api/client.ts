import { HttpError, NetworkError, ParseError, RateLimitError } from './errors';
import { parseRateLimit } from './rateLimit';

export const API_BASE_URL = 'https://api.github.com';
export const API_VERSION = '2026-03-10';

type QueryValue = string | number | undefined;

export interface GetJsonOptions {
  params?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

export function isAbortError(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) {
    return true;
  }
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  );
}

function toFailure(error: unknown, signal?: AbortSignal): unknown {
  return isAbortError(error, signal)
    ? error
    : new NetworkError({ cause: error });
}

function buildUrl(path: string, params: GetJsonOptions['params']): string {
  const url = new URL(path, API_BASE_URL);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function readMessage(body: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'message' in parsed &&
    typeof parsed.message === 'string' &&
    parsed.message !== ''
  ) {
    return parsed.message;
  }
  return null;
}

function errorMessage(body: string, response: Response): string {
  return (
    readMessage(body) ?? `${response.status} ${response.statusText}`.trim()
  );
}

export async function getJson<T>(
  path: string,
  { params, signal }: GetJsonOptions = {},
): Promise<T> {
  const url = buildUrl(path, params);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': API_VERSION,
      },
      signal,
    });
  } catch (error) {
    throw toFailure(error, signal);
  }

  if (!response.ok) {
    const rateLimit = parseRateLimit(response);
    if (rateLimit) {
      throw new RateLimitError(
        response.status,
        rateLimit.resetAt,
        rateLimit.resource,
      );
    }
  }

  let body: string;
  try {
    body = await response.text();
  } catch (error) {
    throw toFailure(error, signal);
  }

  if (!response.ok) {
    throw new HttpError(response.status, errorMessage(body, response));
  }

  try {
    return JSON.parse(body) as T;
  } catch (cause) {
    throw new ParseError(response.status, { cause });
  }
}
