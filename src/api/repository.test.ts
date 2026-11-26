import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';
import { describe, expect, it } from 'vitest';
import { languages, repositoryDetails } from '@/test/fixtures';
import { server } from '@/test/server';
import { getRepository, getRepositoryLanguages } from './repository';

const INVALID_SEGMENTS: [string, string][] = [
  ['an empty string', ''],
  ['a dot', '.'],
  ['two dots', '..'],
  ['a slash', 'a/b'],
  ['a percent sign', 'a%b'],
];

function captureRequests(wait = 0) {
  const paths: string[] = [];
  server.use(
    http.get('https://api.github.com/*', async ({ request }) => {
      const { pathname } = new URL(request.url);
      paths.push(pathname);
      await delay(wait);
      return HttpResponse.json(
        pathname.endsWith('/languages') ? languages() : repositoryDetails(),
      );
    }),
  );
  return paths;
}

function rejectionOf(promise: Promise<unknown>) {
  return promise.then(
    () => null,
    (error: unknown) => error,
  );
}

describe('getRepository', () => {
  it('requests the repository path', async () => {
    const paths = captureRequests();

    await getRepository('owner', 'react');

    expect(paths).toEqual(['/repos/owner/react']);
  });

  it('returns the parsed repository', async () => {
    captureRequests();

    const result = await getRepository('owner', 'react');

    expect(result).toEqual(repositoryDetails());
  });

  it('keeps dots, hyphens and underscores in the names', async () => {
    const paths = captureRequests();

    await getRepository('my-org_1', 'next.js');

    expect(paths).toEqual(['/repos/my-org_1/next.js']);
  });

  it.each([
    ['a question mark', 'a?b', 'a%3Fb'],
    ['a hash', 'a#b', 'a%23b'],
    ['a backslash', 'a\\b', 'a%5Cb'],
  ])('encodes %s in a name', async (_label, name, encoded) => {
    const paths = captureRequests();

    await getRepository('owner', name);

    expect(paths).toEqual([`/repos/owner/${encoded}`]);
  });

  it.each(INVALID_SEGMENTS)(
    'rejects %s as the owner without a request',
    async (_label, owner) => {
      const paths = captureRequests();

      const error = await rejectionOf(getRepository(owner, 'react'));

      expect(error).toMatchObject({ kind: 'http', status: 404 });
      expect(paths).toHaveLength(0);
    },
  );

  it.each(INVALID_SEGMENTS)(
    'rejects %s as the name without a request',
    async (_label, name) => {
      const paths = captureRequests();

      const error = await rejectionOf(getRepository('owner', name));

      expect(error).toMatchObject({ kind: 'http', status: 404 });
      expect(paths).toHaveLength(0);
    },
  );
});

describe('getRepositoryLanguages', () => {
  it('requests the languages path', async () => {
    const paths = captureRequests();

    await getRepositoryLanguages('owner', 'react');

    expect(paths).toEqual(['/repos/owner/react/languages']);
  });

  it('returns the parsed languages', async () => {
    captureRequests();

    const result = await getRepositoryLanguages('owner', 'react');

    expect(result).toEqual(languages());
  });

  it('rejects an invalid name without a request', async () => {
    const paths = captureRequests();

    const error = await rejectionOf(getRepositoryLanguages('owner', '..'));

    expect(error).toMatchObject({ kind: 'http', status: 404 });
    expect(paths).toHaveLength(0);
  });
});

describe('aborting', () => {
  it.each([
    ['repository', getRepository],
    ['languages', getRepositoryLanguages],
  ])('stops the %s request through the signal', async (_label, request) => {
    captureRequests(100);
    const controller = new AbortController();

    const pending = rejectionOf(request('owner', 'react', controller.signal));
    controller.abort();

    expect(await pending).toMatchObject({ name: 'AbortError' });
  });
});
