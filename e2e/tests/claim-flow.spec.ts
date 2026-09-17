/**
 * Issue #456 — Playwright E2E suite for the claim flow.
 *
 * Tests the recipient's claim journey in isolation:
 *   1. Navigate to /claim/:token
 *   2. Verify claim card loads with correct details
 *   3. Enter destination address
 *   4. Submit claim
 *   5. Verify success/failure states
 *   6. Test error paths (invalid token, expired claim, etc.)
 */

import { test, expect } from '@playwright/test';

const VALID_TOKEN = 'e2e-claim-test-token-abc123';
const INVALID_TOKEN = 'invalid-token-xyz';
const DESTINATION_ADDRESS = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

test.describe('Claim flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock claim verification API
    await page.route('**/api/accounts/**', (route) => {
      const url = route.request().url();

      if (url.includes('/verify') || url.includes('verify')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mock-account-id',
            status: 'created',
            stellarAddress: DESTINATION_ADDRESS,
            amount: '10.0000000',
            assetCode: 'XLM',
            senderAddress: 'GBC7SNSD7S55SD3QNVA5PRYXK5MI6QPOHBTYJVU6QPYFZIWI6GH5C5L5',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          }),
        });
        return;
      }

      // Default: return account
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-account-id',
          status: 'created',
          stellarAddress: DESTINATION_ADDRESS,
        }),
      });
    });

    // Mock claim redemption API
    await page.route('**/api/accounts/redeem**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-account-id',
          status: 'claimed',
          stellarTxHash: 'mock-tx-hash-abc123',
        }),
      });
    });
  });

  test('loads claim page and shows claim card', async ({ page }) => {
    await page.goto(`/claim/${VALID_TOKEN}`);

    // Should show the claim heading
    await expect(
      page.getByRole('heading', { name: /claim your payment/i }),
    ).toBeVisible({ timeout: 15_000 });

    // Should show claim card with amount
    await expect(page.getByText(/10/)).toBeVisible({ timeout: 10_000 });
  });

  test('allows entering destination address and claiming', async ({ page }) => {
    await page.goto(`/claim/${VALID_TOKEN}`);
    await expect(
      page.getByRole('heading', { name: /claim your payment/i }),
    ).toBeVisible({ timeout: 15_000 });

    // Fill destination address
    await page.getByLabel(/your stellar wallet address/i).fill(DESTINATION_ADDRESS);

    // Click claim button
    await page.getByRole('button', { name: /claim now/i }).click();

    // Should show success state
    await expect(
      page.getByRole('heading', { name: /claimed|success|already claimed/i }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('shows error for invalid token', async ({ page }) => {
    await page.route('**/api/accounts/**', (route) => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Claim not found' }),
      });
    });

    await page.goto(`/claim/${INVALID_TOKEN}`);

    // Should show an error state
    await expect(
      page.getByText(/not found|invalid|expired|error/i),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('validates destination address format', async ({ page }) => {
    await page.goto(`/claim/${VALID_TOKEN}`);
    await expect(
      page.getByRole('heading', { name: /claim your payment/i }),
    ).toBeVisible({ timeout: 15_000 });

    // Enter invalid address
    await page.getByLabel(/your stellar wallet address/i).fill('not-a-valid-address');

    // Try to claim
    await page.getByRole('button', { name: /claim now/i }).click();

    // Should show validation error
    await expect(
      page.getByText(/invalid|valid.*address/i),
    ).toBeVisible({ timeout: 5_000 });
  });
});
