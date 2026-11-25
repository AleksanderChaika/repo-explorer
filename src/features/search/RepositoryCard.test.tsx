import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { repository } from '@/test/fixtures';
import RepositoryCard from './RepositoryCard';

function renderCard(overrides: Parameters<typeof repository>[1] = {}) {
  return render(
    <RepositoryCard
      repository={repository('react', {
        description: 'A UI library',
        language: 'TypeScript',
        stargazers_count: 1234567,
        forks_count: 4321,
        updated_at: '2026-03-15T12:00:00Z',
        ...overrides,
      })}
    />,
  );
}

function statValue(label: string) {
  const term = screen.getByText(label, { selector: 'dt' });
  return term.nextElementSibling;
}

describe('RepositoryCard', () => {
  it('labels the article with the repository name', () => {
    renderCard();

    expect(screen.getByRole('article', { name: 'owner/react' })).toBeVisible();
  });

  it('renders the name as a heading', () => {
    renderCard();

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      'owner/react',
    );
  });

  it('links to the repository page', () => {
    renderCard();

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://github.com/owner/react',
    );
  });

  it('opens the link in a new tab safely', () => {
    renderCard();

    const link = screen.getByRole('link');

    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('announces that the link opens in a new tab', () => {
    renderCard();

    expect(
      screen.getByRole('link', { name: 'owner/react (opens in new tab)' }),
    ).toBeInTheDocument();
  });

  it('shows the description', () => {
    renderCard();

    expect(screen.getByText('A UI library')).toBeInTheDocument();
  });

  it('shows a placeholder for a missing description', () => {
    renderCard({ description: null });

    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('shows a placeholder for an empty description', () => {
    renderCard({ description: '' });

    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('shows the owner login', () => {
    renderCard();

    expect(screen.getByText('owner')).toBeInTheDocument();
  });

  it('renders the avatar as a decorative lazy image', () => {
    renderCard();

    const avatar = screen.getByRole('presentation');

    expect(avatar).toHaveAttribute(
      'src',
      'https://example.test/avatar.png?s=20',
    );
    expect(avatar).toHaveAttribute('alt', '');
    expect(avatar).toHaveAttribute('loading', 'lazy');
    expect(avatar).toHaveAttribute('width', '20');
    expect(avatar).toHaveAttribute('height', '20');
  });

  it('offers the avatar for 1x, 2x and 3x screens', () => {
    renderCard();

    expect(screen.getByRole('presentation')).toHaveAttribute(
      'srcset',
      'https://example.test/avatar.png?s=20 1x, https://example.test/avatar.png?s=40 2x, https://example.test/avatar.png?s=60 3x',
    );
  });

  it('keeps the existing query of the avatar URL', () => {
    renderCard({
      owner: {
        login: 'owner',
        avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
      },
    });

    expect(screen.getByRole('presentation')).toHaveAttribute(
      'src',
      'https://avatars.githubusercontent.com/u/1?v=4&s=20',
    );
  });

  it('shows an unknown owner without an avatar', () => {
    renderCard({ owner: null });

    expect(screen.getByText('Unknown owner')).toBeInTheDocument();
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
  });

  it('shows the language', () => {
    renderCard();

    expect(statValue('Language')).toHaveTextContent('TypeScript');
  });

  it('hides the language when it is missing', () => {
    renderCard({ language: null });

    expect(screen.queryByText('Language')).not.toBeInTheDocument();
  });

  it('formats stars with grouping', () => {
    renderCard();

    expect(statValue('Stars')).toHaveTextContent('1,234,567');
  });

  it('formats forks with grouping', () => {
    renderCard();

    expect(statValue('Forks')).toHaveTextContent('4,321');
  });

  it('shows the update date in UTC', () => {
    renderCard({ updated_at: '2026-01-01T00:30:00Z' });

    const time = within(statValue('Updated') as HTMLElement).getByText(
      'Jan 1, 2026',
    );

    expect(time).toHaveAttribute('datetime', '2026-01-01T00:30:00Z');
  });

  it('renders the update date as a time element', () => {
    renderCard();

    expect(statValue('Updated')?.firstElementChild?.tagName).toBe('TIME');
  });

  it('hides the update date when it is invalid', () => {
    renderCard({ updated_at: 'not a date' });

    expect(screen.queryByText('Updated')).not.toBeInTheDocument();
  });

  it('wraps each term and its value in a div', () => {
    renderCard();

    const term = screen.getByText('Stars', { selector: 'dt' });

    expect(term.parentElement?.tagName).toBe('DIV');
    expect(term.parentElement?.parentElement?.tagName).toBe('DL');
  });
});
