import { describe, expect, it } from 'vitest';
import {
  ApiError,
  HttpError,
  NetworkError,
  ParseError,
  RateLimitError,
  isApiError,
  type ApiFailure,
} from './errors';

function describeFailure(error: ApiFailure): string {
  switch (error.kind) {
    case 'network':
      return 'network';
    case 'http':
      return `http ${error.status}`;
    case 'rate-limit':
      return `rate-limit ${error.resource ?? 'unknown'}`;
    case 'parse':
      return `parse ${error.status}`;
  }
}

function handle(error: unknown): string {
  if (isApiError(error)) {
    return describeFailure(error);
  }
  return 'unknown';
}

describe('NetworkError', () => {
  it('has kind "network" and keeps the original error as cause', () => {
    const cause = new TypeError('Failed to fetch');
    const error = new NetworkError({ cause });

    expect(error.kind).toBe('network');
    expect(error.name).toBe('NetworkError');
    expect(error.cause).toBe(cause);
  });
});

describe('HttpError', () => {
  it('exposes status and message', () => {
    const error = new HttpError(404, 'Not Found');

    expect(error.kind).toBe('http');
    expect(error.name).toBe('HttpError');
    expect(error.status).toBe(404);
    expect(error.message).toBe('Not Found');
  });
});

describe('RateLimitError', () => {
  it('exposes status, reset time and resource', () => {
    const resetAt = new Date('2026-11-24T10:00:00Z');
    const error = new RateLimitError(403, resetAt, 'search');

    expect(error.kind).toBe('rate-limit');
    expect(error.name).toBe('RateLimitError');
    expect(error.status).toBe(403);
    expect(error.resetAt).toBe(resetAt);
    expect(error.resource).toBe('search');
  });

  it('allows an unknown resource', () => {
    const error = new RateLimitError(429, new Date(0), null);

    expect(error.resource).toBeNull();
  });
});

describe('ParseError', () => {
  it('exposes status and keeps the original error as cause', () => {
    const cause = new SyntaxError('Unexpected token <');
    const error = new ParseError(200, { cause });

    expect(error.kind).toBe('parse');
    expect(error.name).toBe('ParseError');
    expect(error.status).toBe(200);
    expect(error.cause).toBe(cause);
  });
});

describe('isApiError', () => {
  it('returns true for every API error class', () => {
    const errors = [
      new NetworkError(),
      new HttpError(500, 'Server Error'),
      new RateLimitError(429, new Date(0), null),
      new ParseError(200),
    ];

    for (const error of errors) {
      expect(isApiError(error)).toBe(true);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('returns false for foreign values', () => {
    expect(isApiError(new Error('x'))).toBe(false);
    expect(isApiError(new TypeError('Failed to fetch'))).toBe(false);
    expect(isApiError('HttpError')).toBe(false);
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
  });
});

describe('ApiFailure', () => {
  it('narrows by kind', () => {
    expect(describeFailure(new NetworkError())).toBe('network');
    expect(describeFailure(new HttpError(502, 'Bad Gateway'))).toBe('http 502');
    expect(
      describeFailure(new RateLimitError(403, new Date(0), 'search')),
    ).toBe('rate-limit search');
    expect(describeFailure(new ParseError(200))).toBe('parse 200');
  });

  it('narrows unknown to ApiFailure through isApiError', () => {
    expect(handle(new HttpError(503, 'Unavailable'))).toBe('http 503');
    expect(handle(new TypeError('Failed to fetch'))).toBe('unknown');
  });
});
