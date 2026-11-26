import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRateLimitGate } from '@/features/rateLimit/rateLimitGate';
import { languages, repositoryDetails } from '@/test/fixtures';
import { server } from '@/test/server';
import { renderWithProviders } from '@/test/utils';

const ENDPOINT = 'https://api.github.com/repos/:owner/:name';
const LANGUAGES_ENDPOINT = `${ENDPOINT}/languages`;

function handleRepository(respond: () => Response | Promise<Response>) {
  server.use(http.get(ENDPOINT, respond));
}

function handleLanguages(respond: () => Response = foundLanguages) {
  server.use(http.get(LANGUAGES_ENDPOINT, respond));
}

function foundLanguages() {
  return HttpResponse.json(languages());
}

function rateLimited() {
  return new HttpResponse(null, {
    status: 403,
    headers: {
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
    },
  });
}

function found() {
  return HttpResponse.json(repositoryDetails());
}

function failed(status: number) {
  return HttpResponse.json({ message: 'Failed' }, { status });
}

function pageHeading(name: string) {
  return screen.getByRole('heading', { level: 1, name });
}

function noticeHeading(name: string) {
  return screen.findByRole('heading', { level: 3, name });
}

async function languageRows() {
  const section = await screen.findByRole('region', { name: 'Languages' });
  const items = await within(section).findAllByRole('listitem');
  return items.map((item) => item.textContent);
}

describe('RepoPage', () => {
  beforeEach(() => {
    handleLanguages();
  });

  it('shows the repository and announces it only once loaded', async () => {
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    handleRepository(async () => {
      await pending;
      return found();
    });
    renderWithProviders({ route: '/repo/owner/react' });

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();

    release();

    expect(await screen.findByText('A UI library')).toBeInTheDocument();
    expect(pageHeading('owner/react')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Repository loaded');
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('keeps the heading and announces a missing repository', async () => {
    handleRepository(() => failed(404));
    renderWithProviders({ route: '/repo/owner/missing' });

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Repository not found',
      }),
    ).toBeInTheDocument();
    expect(pageHeading('owner/missing')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Repository not found');
  });

  it('moves focus to the heading on Retry and loads the repository', async () => {
    let requests = 0;
    handleRepository(() => {
      requests += 1;
      return requests === 1 ? failed(500) : found();
    });
    const user = userEvent.setup();
    renderWithProviders({ route: '/repo/owner/react' });

    await user.click(await screen.findByRole('button', { name: 'Retry' }));

    expect(pageHeading('owner/react')).toHaveFocus();
    expect(await screen.findByText('A UI library')).toBeInTheDocument();
  });

  it('shows the languages of the repository', async () => {
    handleRepository(found);
    renderWithProviders({ route: '/repo/owner/react' });

    expect(await languageRows()).toEqual([
      'TypeScript 60.0%',
      'CSS 30.0%',
      'HTML 10.0%',
    ]);
  });

  it('says when the repository has no languages', async () => {
    handleRepository(found);
    handleLanguages(() => HttpResponse.json({}));
    renderWithProviders({ route: '/repo/owner/react' });

    expect(
      await screen.findByText('No languages detected'),
    ).toBeInTheDocument();
  });

  it('keeps a languages error in its block and retries from there', async () => {
    let requests = 0;
    handleRepository(found);
    handleLanguages(() => {
      requests += 1;
      return requests === 1 ? failed(500) : foundLanguages();
    });
    const user = userEvent.setup();
    renderWithProviders({ route: '/repo/owner/react' });

    expect(await noticeHeading('Languages unavailable')).toBeInTheDocument();
    expect(screen.getByText('A UI library')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Repository loaded');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Languages unavailable',
    );

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(
      screen.getByRole('heading', { level: 2, name: 'Languages' }),
    ).toHaveFocus();
    expect(await languageRows()).toHaveLength(3);
  });

  it('keeps the repository when the languages hit the rate limit', async () => {
    handleRepository(found);
    handleLanguages(rateLimited);
    renderWithProviders({ route: '/repo/owner/react' });

    expect(await noticeHeading('Rate limit reached')).toBeInTheDocument();
    expect(screen.getByText('A UI library')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Repository loaded');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Languages unavailable',
    );
  });

  it('replaces the address with the canonical one', async () => {
    handleRepository(found);
    const { router } = renderWithProviders({ route: '/repo/Owner/React' });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'owner/react' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/repo/owner/react');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(document.body).toHaveFocus();
  });

  describe('when a block ends', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('loads the repository and its languages by itself', async () => {
      handleRepository(found);
      const coreGate = createRateLimitGate();
      coreGate.report(new Date(Date.now() + 60_000));
      renderWithProviders({ route: '/repo/owner/react', coreGate });

      expect(screen.getByRole('status')).toHaveTextContent('Repository paused');

      await act(() => vi.advanceTimersByTimeAsync(60_000));

      expect(await screen.findByText('A UI library')).toBeInTheDocument();
      expect(await languageRows()).toHaveLength(3);
    });
  });
});
