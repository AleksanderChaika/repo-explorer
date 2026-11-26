import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { describe, expect, it } from 'vitest';
import { repositoryDetails } from '@/test/fixtures';
import { server } from '@/test/server';
import { renderWithProviders } from '@/test/utils';

const ENDPOINT = 'https://api.github.com/repos/:owner/:name';

function handleRepository(respond: () => Response | Promise<Response>) {
  server.use(http.get(ENDPOINT, respond));
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

describe('RepoPage', () => {
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
});
