const AVATAR_DENSITIES = [1, 2, 3];

export function sizedAvatarUrl(avatarUrl: string, size: number): string {
  const url = new URL(avatarUrl);
  url.searchParams.set('s', String(size));
  return url.toString();
}

export function avatarSrcSet(avatarUrl: string, size: number): string {
  return AVATAR_DENSITIES.map(
    (density) => `${sizedAvatarUrl(avatarUrl, size * density)} ${density}x`,
  ).join(', ');
}
