import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ErrorNotice from './ErrorNotice';

function renderNotice(
  props: { onRetry?: () => void; retryDisabled?: boolean } = {},
) {
  return render(
    <ErrorNotice title="Something broke" message="Try later." {...props} />,
  );
}

function retryButton() {
  return screen.getByRole('button', { name: 'Retry' });
}

describe('ErrorNotice', () => {
  it('shows the title as a level 2 heading', () => {
    renderNotice();

    expect(
      screen.getByRole('heading', { level: 2, name: 'Something broke' }),
    ).toBeInTheDocument();
  });

  it('shows the message', () => {
    renderNotice();

    expect(screen.getByText('Try later.')).toBeInTheDocument();
  });

  it('has no button without onRetry', () => {
    renderNotice();

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onRetry when Retry is clicked', async () => {
    const onRetry = vi.fn<() => void>();
    const user = userEvent.setup();
    renderNotice({ onRetry });

    await user.click(retryButton());

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('disables Retry when retryDisabled is set', () => {
    renderNotice({ onRetry: () => {}, retryDisabled: true });

    expect(retryButton()).toBeDisabled();
  });

  it('has no live region', () => {
    const { container } = renderNotice({ onRetry: () => {} });

    expect(
      container.querySelector('[role="alert"], [role="status"], [aria-live]'),
    ).toBeNull();
  });
});
