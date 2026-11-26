import { describe, expect, it } from 'vitest';
import { avatarSrcSet, sizedAvatarUrl } from './avatar';

const URL_WITH_QUERY = 'https://avatars.githubusercontent.com/u/1?v=4';

describe('sizedAvatarUrl', () => {
  it('asks for the given size', () => {
    expect(sizedAvatarUrl(URL_WITH_QUERY, 64)).toBe(
      'https://avatars.githubusercontent.com/u/1?v=4&s=64',
    );
  });
});

describe('avatarSrcSet', () => {
  it('offers one, two and three times the given size', () => {
    expect(avatarSrcSet(URL_WITH_QUERY, 64)).toBe(
      'https://avatars.githubusercontent.com/u/1?v=4&s=64 1x, https://avatars.githubusercontent.com/u/1?v=4&s=128 2x, https://avatars.githubusercontent.com/u/1?v=4&s=192 3x',
    );
  });
});
