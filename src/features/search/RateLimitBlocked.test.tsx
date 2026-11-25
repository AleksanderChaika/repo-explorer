import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RateLimitBlocked from './RateLimitBlocked';

const NOW = Date.UTC(2026, 0, 15, 20, 0, 0);

function renderBlocked(ms: number) {
  return render(<RateLimitBlocked blockedUntil={Date.now() + ms} />);
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('RateLimitBlocked', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the title', () => {
    renderBlocked(90_000);

    expect(
      screen.getByRole('heading', { name: 'Search paused', level: 2 }),
    ).toBeInTheDocument();
  });

  it('shows when the search will start', () => {
    renderBlocked(90_000);

    expect(
      screen.getByText(
        'GitHub is limiting requests. Your search will start at 12:01 (in 1:30).',
      ),
    ).toBeInTheDocument();
  });

  it('counts down', () => {
    renderBlocked(90_000);

    advance(1000);

    expect(screen.getByText(/\(in 1:29\)\.$/)).toBeInTheDocument();
  });

  it('says the search is starting when the countdown ends', () => {
    renderBlocked(90_000);

    advance(90_000);

    expect(
      screen.getByText(
        'GitHub is limiting requests. Your search will start now.',
      ),
    ).toBeInTheDocument();
  });

  it('has no button', () => {
    renderBlocked(90_000);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('restarts the countdown when the reset time changes', () => {
    const { rerender } = renderBlocked(90_000);
    advance(90_000);
    advance(30_000);

    rerender(<RateLimitBlocked blockedUntil={Date.now() + 60_000} />);

    expect(screen.getByText(/\(in 1:00\)\.$/)).toBeInTheDocument();
  });
});
