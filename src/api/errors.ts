export type ApiErrorKind = 'network' | 'http' | 'rate-limit' | 'parse';

export abstract class ApiError<
  K extends ApiErrorKind = ApiErrorKind,
> extends Error {
  readonly kind: K;

  constructor(kind: K, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ApiError';
    this.kind = kind;
  }
}

export class NetworkError extends ApiError<'network'> {
  constructor(options?: ErrorOptions) {
    super('network', 'Network request failed', options);
    this.name = 'NetworkError';
  }
}

export class HttpError extends ApiError<'http'> {
  readonly status: number;

  constructor(status: number, message: string, options?: ErrorOptions) {
    super('http', message, options);
    this.name = 'HttpError';
    this.status = status;
  }
}

export class RateLimitError extends ApiError<'rate-limit'> {
  readonly status: number;
  readonly resetAt: Date;
  readonly resource: string | null;

  constructor(
    status: number,
    resetAt: Date,
    resource: string | null,
    options?: ErrorOptions,
  ) {
    super('rate-limit', 'GitHub API rate limit exceeded', options);
    this.name = 'RateLimitError';
    this.status = status;
    this.resetAt = resetAt;
    this.resource = resource;
  }
}

export class ParseError extends ApiError<'parse'> {
  readonly status: number;

  constructor(status: number, options?: ErrorOptions) {
    super('parse', 'Response body is not valid JSON', options);
    this.name = 'ParseError';
    this.status = status;
  }
}

export type ApiFailure = NetworkError | HttpError | RateLimitError | ParseError;

export function isApiError(error: unknown): error is ApiFailure {
  return error instanceof ApiError;
}
