import { describe, expect, it } from 'vitest';
import { searchLoader } from './searchLoader';

function load(path: string) {
  return searchLoader({ request: new Request(`http://localhost${path}`) });
}

describe('searchLoader', () => {
  it('returns null for a canonical URL', () => {
    expect(load('/?q=react&sort=stars')).toBeNull();
  });

  it('redirects a non-canonical URL to the canonical one', () => {
    expect(load('/?q=%20react%20&foo=1')?.headers.get('Location')).toBe(
      '/?q=react',
    );
  });

  it('marks the redirect as a replace so history does not grow', () => {
    expect(load('/?q=%20react')?.headers.get('X-Remix-Replace')).toBe('true');
  });

  it('redirects to the bare path when nothing remains', () => {
    expect(load('/?foo=1')?.headers.get('Location')).toBe('/');
  });

  it('keeps the pathname of the request', () => {
    expect(load('/x?q=%20a')?.headers.get('Location')).toBe('/x?q=a');
  });
});
