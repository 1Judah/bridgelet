import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { RateLimitBanner } from './rate-limit-banner';

describe('RateLimitBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with role="alert" and aria-live="assertive"', () => {
    render(<RateLimitBanner retryAfter={30} />);
    const banner = screen.getByRole('alert');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute('aria-live', 'assertive');
  });

  it('shows a countdown message with the initial seconds when retryAfter is provided', () => {
    render(<RateLimitBanner retryAfter={30} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/please wait 30 seconds before retrying/i);
  });

  it('uses singular "second" when retryAfter is 1', () => {
    render(<RateLimitBanner retryAfter={1} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/please wait 1 second before retrying/i);
    expect(screen.getByRole('alert')).not.toHaveTextContent(/seconds/);
  });

  it('shows a generic message when retryAfter is null', () => {
    render(<RateLimitBanner retryAfter={null} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/too many requests/i);
    expect(screen.getByRole('alert')).not.toHaveTextContent(/please wait \d+/i);
  });

  it('counts down each second', () => {
    render(<RateLimitBanner retryAfter={3} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/3 seconds/);

    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole('alert')).toHaveTextContent(/2 seconds/);

    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole('alert')).toHaveTextContent(/1 second/);
  });

  it('shows the generic message when the countdown reaches zero', () => {
    render(<RateLimitBanner retryAfter={2} />);

    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByRole('alert')).toHaveTextContent(/too many requests/i);
  });

  it('restarts the countdown when retryAfter prop changes', () => {
    const { rerender } = render(<RateLimitBanner retryAfter={5} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/5 seconds/);

    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByRole('alert')).toHaveTextContent(/2 seconds/);

    rerender(<RateLimitBanner retryAfter={10} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/10 seconds/);
  });
});
