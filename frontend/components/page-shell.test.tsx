import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageShell } from './page-shell';

// SiteNav and SiteFooter are tested in their own suites; stub them here.
vi.mock('./site-nav', () => ({
  SiteNav: () => <nav aria-label="Main" data-testid="site-nav" />,
}));
vi.mock('./site-footer', () => ({
  SiteFooter: () => <footer data-testid="site-footer" />,
}));

describe('PageShell', () => {
  it('renders the page title as an h1', () => {
    render(<PageShell title="Send a Payment" description="Desc" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Send a Payment' })).toBeInTheDocument();
  });

  it('renders the description paragraph', () => {
    render(<PageShell title="Title" description="Some description text" />);
    expect(screen.getByText('Some description text')).toBeInTheDocument();
  });

  it('renders children inside a section', () => {
    render(
      <PageShell title="T" description="D">
        <span data-testid="child">content</span>
      </PageShell>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders the SiteNav and SiteFooter', () => {
    render(<PageShell title="T" description="D" />);
    expect(screen.getByTestId('site-nav')).toBeInTheDocument();
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
  });

  it('renders optional footer slot when provided', () => {
    render(
      <PageShell title="T" description="D" footer={<div data-testid="cta-banner">CTA</div>} />,
    );
    expect(screen.getByTestId('cta-banner')).toBeInTheDocument();
  });

  it('renders nothing in the footer slot when not provided', () => {
    const { container } = render(<PageShell title="T" description="D" />);
    expect(container.querySelector('[data-testid="cta-banner"]')).toBeNull();
  });
});
