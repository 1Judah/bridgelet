import { afterEach, describe, expect, it, vi } from 'vitest';
import { analytics, conditional, VALID_EXPIRY_WINDOWS } from '@/lib/analytics';

function plausibleMock() {
  return vi.fn();
}

describe('conditional payload property helpers (§3.2)', () => {
  it('builds the claim_id property', () => {
    expect(conditional.claimId('tok_abc')).toEqual({ claim_id: 'tok_abc' });
  });

  it('builds the asset_type property', () => {
    expect(conditional.assetType('XLM')).toEqual({ asset_type: 'XLM' });
    expect(conditional.assetType('USDC')).toEqual({ asset_type: 'USDC' });
  });

  it('builds the amount_usd_equiv property from a numeric value', () => {
    expect(conditional.amountUsdEquiv(25.5)).toEqual({ amount_usd_equiv: 25.5 });
    expect(conditional.amountUsdEquiv(0)).toEqual({ amount_usd_equiv: 0 });
  });

  it('builds the expiry_days property for each valid window', () => {
    expect(conditional.expiryDays(1)).toEqual({ expiry_days: 1 });
    expect(conditional.expiryDays(7)).toEqual({ expiry_days: 7 });
    expect(conditional.expiryDays(30)).toEqual({ expiry_days: 30 });
    expect(conditional.expiryDays(90)).toEqual({ expiry_days: 90 });
  });

  it('builds the expiry_days property as null for a non-expiring payment', () => {
    expect(conditional.expiryDays(null)).toEqual({ expiry_days: null });
  });

  it('exposes the enumerated expiry windows from the spec', () => {
    expect(VALID_EXPIRY_WINDOWS).toEqual([1, 7, 30, 90]);
  });
});

describe('conditional props wired into emitted events', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as unknown as { plausible?: unknown }).plausible;
  });

  it('Claim Verified carries claim_id and asset_type via the helpers', () => {
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock();

    analytics.claimVerified({
      claimId: 'tok_abc',
      assetType: 'XLM',
      expiryDaysRemaining: 7,
      verificationTimeMs: 42,
    });

    const call = (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible
      .mock.calls[0]!;
    expect(call[1].props).toEqual(
      expect.objectContaining({ claim_id: 'tok_abc', asset_type: 'XLM' }),
    );
  });

  it('Claim Verified omits asset_type when no asset is available', () => {
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock();

    analytics.claimVerified({ claimId: 'tok_abc', verificationTimeMs: 42 });

    const call = (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible
      .mock.calls[0]!;
    expect(call[1].props).toEqual(
      expect.objectContaining({ claim_id: 'tok_abc' }),
    );
    expect('asset_type' in call[1].props).toBe(false);
  });

  it('Claim CTA Clicked carries claim_id and asset_type via the helpers', () => {
    (window as unknown as { plausible?: ReturnType<typeof plausibleMock> }).plausible =
      plausibleMock();

    analytics.claimCtaClicked({ claimId: 'tok_abc', assetType: 'XLM' });

    const call = (window as unknown as { plausible: ReturnType<typeof plausibleMock> }).plausible
      .mock.calls[0]!;
    expect(call[1].props).toEqual(
      expect.objectContaining({ journey: 'recipient', claim_id: 'tok_abc', asset_type: 'XLM' }),
    );
  });
});