import { http, HttpResponse } from 'msw/http';
import { describe, expect, it } from 'vitest';
import { server } from './server';

const PING_URL = 'https://msw-check.test/ping';

describe('msw server', () => {
  it('answers with a handler registered through server.use', async () => {
    server.use(http.get(PING_URL, () => HttpResponse.json({ ok: true })));

    const response = await fetch(PING_URL);

    expect(await response.json()).toEqual({ ok: true });
  });

  it('does not keep the handler from the previous test', async () => {
    await expect(fetch(PING_URL)).rejects.toThrow();
  });

  it('fails a request without a handler instead of passing it through', async () => {
    const error = await fetch('https://msw-check.test/unhandled').then(
      () => null,
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(TypeError);
    const cause = (error as TypeError).cause;
    expect(cause).toBeInstanceOf(Error);
    expect((cause as Error).message).toContain('"error" strategy');
  });
});
