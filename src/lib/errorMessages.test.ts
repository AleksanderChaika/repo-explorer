import { describe, expect, it } from 'vitest';
import { HttpError } from '@/api/errors';
import { describeRequestError } from './errorMessages';

describe('describeRequestError', () => {
  it('describes a 422 as a generic failure, not a rejected search', () => {
    expect(
      describeRequestError(new HttpError(422, 'Validation failed')),
    ).toEqual({
      title: 'Something went wrong',
      message: 'GitHub returned an error (status 422). Try again in a moment.',
    });
  });
});
