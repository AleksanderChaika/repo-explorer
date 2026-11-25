import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HttpError,
  NetworkError,
  ParseError,
  RateLimitError,
} from '@/api/errors';
import type { ApiFailure } from '@/api/errors';
import SearchError from './SearchError';

const NOW = Date.UTC(2026, 0, 15, 20, 0, 0);

function rateLimit(ms: number) {
  return new RateLimitError(403, new Date(Date.now() + ms), 'search');
}

function renderError(error: ApiFailure) {
  const onRetry = vi.fn<() => void>();
  const view = render(<SearchError error={error} onRetry={onRetry} />);
  return { onRetry, ...view };
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function retryButton() {
  return screen.getByRole('button', { name: 'Retry' });
}

describe('SearchError', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('titles', () => {
    it.each<[string, () => ApiFailure, string]>([
      ['network', () => new NetworkError(), 'Connection problem'],
      [
        'http 500',
        () => new HttpError(500, 'Server error'),
        'Something went wrong',
      ],
      [
        'http 422',
        () => new HttpError(422, 'Validation failed'),
        'Search query not accepted',
      ],
      ['rate-limit', () => rateLimit(90_000), 'Rate limit reached'],
      ['parse', () => new ParseError(200), 'Unexpected response'],
    ])('shows the title for a %s error', (_name, createError, title) => {
      renderError(createError());

      expect(
        screen.getByRole('heading', { name: title, level: 2 }),
      ).toBeInTheDocument();
    });
  });

  describe('messages', () => {
    it.each<[string, () => ApiFailure, string]>([
      [
        'network',
        () => new NetworkError(),
        "Couldn't reach GitHub. Check your connection and try again.",
      ],
      [
        'http 500',
        () => new HttpError(500, 'Server error'),
        'GitHub returned an error (status 500). Try again in a moment.',
      ],
      [
        'http 422',
        () => new HttpError(422, 'Validation failed'),
        "GitHub couldn't process this search. Try a different query.",
      ],
      [
        'parse',
        () => new ParseError(200),
        "GitHub sent a response we couldn't read. Try again.",
      ],
    ])('shows the message for a %s error', (_name, createError, message) => {
      renderError(createError());

      expect(screen.getByText(message)).toBeInTheDocument();
    });

    it('shows the status of an unexpected http error', () => {
      renderError(new HttpError(503, 'Unavailable'));

      expect(screen.getByText(/status 503/)).toBeInTheDocument();
    });
  });

  describe('unknown errors', () => {
    const unknown = { kind: 'unknown' } as never;

    it('shows a generic title', () => {
      renderError(unknown);

      expect(
        screen.getByRole('heading', { name: 'Something went wrong' }),
      ).toBeInTheDocument();
    });

    it('shows a generic message', () => {
      renderError(unknown);

      expect(screen.getByText('Please try again.')).toBeInTheDocument();
    });
  });

  describe('errors that are not rate limits', () => {
    it('enables Retry', () => {
      renderError(new NetworkError());

      expect(retryButton()).toBeEnabled();
    });

    it('calls onRetry once when Retry is clicked', () => {
      const { onRetry } = renderError(new NetworkError());

      fireEvent.click(retryButton());

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('does not start timers', () => {
      renderError(new NetworkError());

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('rate limit', () => {
    it('shows the local reset time', () => {
      renderError(rateLimit(90_000));

      expect(screen.getByText(/search again at 12:01 /)).toBeInTheDocument();
    });

    it('shows the time remaining', () => {
      renderError(rateLimit(90_000));

      expect(screen.getByText(/\(in 1:30\)\.$/)).toBeInTheDocument();
    });

    it('disables Retry while time remains', () => {
      renderError(rateLimit(90_000));

      expect(retryButton()).toBeDisabled();
    });

    it('updates the remaining time after one second', () => {
      renderError(rateLimit(90_000));

      advance(1000);

      expect(screen.getByText(/\(in 1:29\)\.$/)).toBeInTheDocument();
    });

    it('keeps counting after the first tick', () => {
      renderError(rateLimit(90_000));

      advance(1000);
      advance(2000);

      expect(screen.getByText(/\(in 1:27\)\.$/)).toBeInTheDocument();
    });

    it('tells the user to search again when the countdown ends', () => {
      renderError(rateLimit(90_000));

      advance(90_000);

      expect(
        screen.getByText(
          'GitHub is limiting requests. You can search again now.',
        ),
      ).toBeInTheDocument();
    });

    it('enables Retry when the countdown ends', () => {
      renderError(rateLimit(90_000));

      advance(90_000);

      expect(retryButton()).toBeEnabled();
    });

    it('ignores clicks while Retry is disabled', () => {
      const { onRetry } = renderError(rateLimit(90_000));

      fireEvent.click(retryButton());

      expect(onRetry).not.toHaveBeenCalled();
    });

    it('calls onRetry once after the countdown ends', () => {
      const { onRetry } = renderError(rateLimit(90_000));
      advance(90_000);

      fireEvent.click(retryButton());

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('stops the timer when the countdown ends', () => {
      renderError(rateLimit(90_000));

      advance(90_000);

      expect(vi.getTimerCount()).toBe(0);
    });

    it('starts a timer while time remains', () => {
      renderError(rateLimit(90_000));

      expect(vi.getTimerCount()).toBe(1);
    });

    it('clears the timer on unmount', () => {
      const { unmount } = renderError(rateLimit(90_000));

      unmount();

      expect(vi.getTimerCount()).toBe(0);
    });

    describe('when the reset time changes', () => {
      function renderWithEndedCountdown() {
        const view = renderError(rateLimit(90_000));
        advance(90_000);
        advance(30_000);
        view.rerender(
          <SearchError error={rateLimit(60_000)} onRetry={view.onRetry} />,
        );
        return view;
      }

      it('shows the new remaining time right after the change', () => {
        renderWithEndedCountdown();

        expect(screen.getByText(/\(in 1:00\)\.$/)).toBeInTheDocument();
      });

      it('disables Retry right after the change', () => {
        renderWithEndedCountdown();

        expect(retryButton()).toBeDisabled();
      });

      it('starts a new timer after the change', () => {
        renderWithEndedCountdown();

        expect(vi.getTimerCount()).toBe(1);
      });

      it('ticks again after the change', () => {
        renderWithEndedCountdown();

        advance(1000);

        expect(screen.getByText(/\(in 0:59\)\.$/)).toBeInTheDocument();
      });
    });

    describe('when the reset time has already passed', () => {
      it('tells the user to search again', () => {
        renderError(rateLimit(-5000));

        expect(
          screen.getByText(
            'GitHub is limiting requests. You can search again now.',
          ),
        ).toBeInTheDocument();
      });

      it('enables Retry', () => {
        renderError(rateLimit(-5000));

        expect(retryButton()).toBeEnabled();
      });

      it('does not start a timer', () => {
        renderError(rateLimit(-5000));

        expect(vi.getTimerCount()).toBe(0);
      });
    });
  });
});
