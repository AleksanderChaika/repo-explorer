import { describe, expect, it } from 'vitest';
import { homepageUrl } from './homepageUrl';

describe('homepageUrl', () => {
  it.each([
    ['', null],
    ['example.com', 'https://example.com'],
    ['example.com:8080', 'https://example.com:8080'],
    ['http://example.com', 'http://example.com'],
    ['javascript:alert(1)', null],
  ])('turns %j into %j', (value, expected) => {
    expect(homepageUrl(value)).toBe(expected);
  });
});
