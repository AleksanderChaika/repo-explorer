import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import Pagination from './Pagination';
import type { SearchState } from './searchParams';

function searchState(overrides: Partial<SearchState> = {}): SearchState {
  return { q: 'react', sort: undefined, order: 'desc', page: 1, ...overrides };
}

function renderPagination(
  state: SearchState,
  totalCount: number,
  route = '/?q=react',
  onNavigate?: () => void,
) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <Pagination
            state={state}
            totalCount={totalCount}
            onNavigate={onNavigate}
          />
        ),
      },
    ],
    { initialEntries: [route] },
  );
  const view = render(<RouterProvider router={router} />);
  return { ...view, router };
}

function keepDocument() {
  const cancel = (event: Event) => {
    event.preventDefault();
  };
  window.addEventListener('click', cancel);
  onTestFinished(() => {
    window.removeEventListener('click', cancel);
  });
}

describe('Pagination', () => {
  it('is a navigation landmark named Pagination', () => {
    renderPagination(searchState({ page: 2 }), 100);

    expect(
      screen.getByRole('navigation', { name: 'Pagination' }),
    ).toBeInTheDocument();
  });

  it('shows the current page and the total', () => {
    renderPagination(searchState({ page: 2 }), 100);

    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
  });

  it('caps the page count at the maximum', () => {
    renderPagination(searchState(), 5000);

    expect(screen.getByText('Page 1 of 50')).toBeInTheDocument();
  });

  it('links Previous to the page before', () => {
    renderPagination(searchState({ page: 3 }), 100);

    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/?q=react&page=2',
    );
  });

  it('links Previous to the first page without a page parameter', () => {
    renderPagination(searchState({ page: 2 }), 100);

    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/?q=react',
    );
  });

  it('links Next to the page after', () => {
    renderPagination(searchState({ page: 2 }), 100);

    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/?q=react&page=3',
    );
  });

  it('keeps sort and order in the links', () => {
    renderPagination(
      searchState({ page: 2, sort: 'stars', order: 'asc' }),
      100,
    );

    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/?q=react&sort=stars&order=asc&page=3',
    );
  });

  it('has no Previous link on the first page', () => {
    renderPagination(searchState(), 100);

    expect(
      screen.queryByRole('link', { name: 'Previous' }),
    ).not.toBeInTheDocument();
  });

  it('has a Next link on the first page', () => {
    renderPagination(searchState(), 100);

    expect(screen.getByRole('link', { name: 'Next' })).toBeInTheDocument();
  });

  it('shows the page on the first page', () => {
    renderPagination(searchState(), 100);

    expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
  });

  it('has no Next link on the last page', () => {
    renderPagination(searchState({ page: 5 }), 100);

    expect(
      screen.queryByRole('link', { name: 'Next' }),
    ).not.toBeInTheDocument();
  });

  it('has no Next link at the page limit', () => {
    renderPagination(searchState({ page: 50 }), 5000);

    expect(
      screen.queryByRole('link', { name: 'Next' }),
    ).not.toBeInTheDocument();
  });

  it('has a Previous link on the last page', () => {
    renderPagination(searchState({ page: 5 }), 100);

    expect(screen.getByRole('link', { name: 'Previous' })).toBeInTheDocument();
  });

  it('shows the page on the last page', () => {
    renderPagination(searchState({ page: 5 }), 100);

    expect(screen.getByText('Page 5 of 5')).toBeInTheDocument();
  });

  it('renders nothing for a single page', () => {
    const { container } = renderPagination(searchState(), 20);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there are no results', () => {
    const { container } = renderPagination(searchState(), 0);

    expect(container).toBeEmptyDOMElement();
  });

  it('clamps the current page to the last page', () => {
    renderPagination(searchState({ page: 9 }), 50);

    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();
  });

  it('links Previous from the clamped page', () => {
    renderPagination(searchState({ page: 9 }), 50);

    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/?q=react&page=2',
    );
  });

  it('navigates to the next page on click', async () => {
    const user = userEvent.setup();
    const { router } = renderPagination(
      searchState({ page: 2 }),
      100,
      '/?q=react&page=2',
    );

    await user.click(screen.getByRole('link', { name: 'Next' }));

    expect(router.state.location.search).toBe('?q=react&page=3');
  });

  it('has no status role', () => {
    renderPagination(searchState({ page: 2 }), 100);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('has no alert role', () => {
    renderPagination(searchState({ page: 2 }), 100);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('has no aria-live attribute', () => {
    const { container } = renderPagination(searchState({ page: 2 }), 100);

    expect(container.querySelector('[aria-live]')).toBeNull();
  });

  it.each(['Previous', 'Next'])('reports a plain click on %s', async (name) => {
    const onNavigate = vi.fn<() => void>();
    renderPagination(searchState({ page: 2 }), 100, '/?q=react', onNavigate);

    await userEvent.click(screen.getByRole('link', { name }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it.each(['Previous', 'Next'])('reports Enter on %s', async (name) => {
    const onNavigate = vi.fn<() => void>();
    renderPagination(searchState({ page: 2 }), 100, '/?q=react', onNavigate);
    screen.getByRole('link', { name }).focus();

    await userEvent.keyboard('{Enter}');

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it.each(['metaKey', 'ctrlKey', 'shiftKey', 'altKey'])(
    'does not report a click with %s',
    (modifier) => {
      keepDocument();
      const onNavigate = vi.fn<() => void>();
      renderPagination(searchState({ page: 2 }), 100, '/?q=react', onNavigate);

      fireEvent.click(screen.getByRole('link', { name: 'Next' }), {
        [modifier]: true,
      });

      expect(onNavigate).not.toHaveBeenCalled();
    },
  );
});
