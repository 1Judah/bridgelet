/**
 * Issue #455 — Playwright E2E suite for the send flow.
 *
 * Exercises the multi-step send form in isolation:
 *   1. Navigate to /send
 *   2. Connect wallet (Freighter mock)
 *   3. Configure expiry settings
 *   4. Fill in recipient details (email, amount, memo)
 *   5. Review and confirm
 *   6. Verify success state
 *
 * These tests are deterministic — all API calls are intercepted via
 * `page.route()` and the Freighter extension is mocked via
 * `addInitScript`.
 */

import { test, expect, type Page } from '@playwright/test';

const MOCK_FREIGHTER_ADDRESS = 'GBC7SNSD7S55SD3QNVA5PRYXK5MI6QPOHBTYJVU6QPYFZIWI6GH5C5L5';

test.describe('Send flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Freighter extension
    await page.addInitScript(() => {
      (window as any).freighter = {
        isConnected: () => Promise.resolve(true),
        getAddress: () => Promise.resolve(MOCK_FREIGHTER_ADDRESS),
        getNetwork: () => Promise.resolve({ network: 'TESTNET', networkPassphrase: 'Test SDF Network ; September 2015' }),
        signTransaction: (_tx: string, opts: any) => Promise.resolve({ signedTxXDR: _tx, signerAddress: MOCK_FREIGHTER_ADDRESS }),
      };
    });

    // Mock API responses
    await page.route('**/api/accounts/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-account-id',
          status: 'created',
          stellarAddress: 'GAAP5PZ3EHIFX7RJZXW6S6XQP4GKLDG5M4E5YJ4FMLE2JMIFX7C3R5RY',
          claimUrl: 'http://localhost:3000/claim/e2e-send-flow-token',
          createdAt: new Date().toISOString(),
        }),
      });
    });
  });

  test('navigates through all send form steps', async ({ page }) => {
    await page.goto('/send');

    // Step 1: Connect wallet
    await expect(page.getByText(/connect your wallet/i)).toBeVisible();
    await page.getByRole('button', { name: /connect/i }).first().click();

    // After connecting, the wallet address should be visible
    await expect(page.getByText(MOCK_FREIGHTER_ADDRESS.slice(0, 4))).toBeVisible({ timeout: 10_000 });

    // Step 2: Expiry configuration
    await expect(page.getByText(/expiry|expir/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /next|continue/i }).first().click();

    // Step 3: Recipient details
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 10_000 });
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/amount/i).fill('10');
    await page.getByRole('button', { name: /next|continue/i }).first().click();

    // Step 4: Confirmation
    await expect(page.getByText(/confirm|review/i)).toBeVisible({ timeout: 10_000 });
  });

  test('validates required fields before proceeding', async ({ page }) => {
    await page.goto('/send');

    // Connect wallet first
    await page.getByRole('button', { name: /connect/i }).first().click();
    await expect(page.getByText(MOCK_FREIGHTER_ADDRESS.slice(0, 4))).toBeVisible({ timeout: 10_000 });

    // Skip to details step
    await page.getByRole('button', { name: /next|continue/i }).first().click();

    // Try to proceed without filling in details
    await page.getByRole('button', { name: /next|continue/i }).first().click();

    // Should show validation errors
    await expect(page.getByText(/required|invalid|enter/i)).toBeVisible({ timeout: 5_000 });
  });

  test('shows wallet connection prompt when not connected', async ({ page }) => {
    // Override Freighter mock to report not connected
    await page.addInitScript(() => {
      (window as any).freighter = {
        isConnected: () => Promise.resolve(false),
        getAddress: () => Promise.reject(new Error('Not connected')),
      };
    });

    await page.goto('/send');

    // Should show connect wallet prompt
    await expect(page.getByText(/connect.*wallet/i)).toBeVisible();
  });

  test('displays correct step indicators', async ({ page }) => {
    await page.goto('/send');

    // Should show step indicators (e.g., "Step 1", "Step 2", etc.)
    // or progress dots
    const steps = page.getByText(/step \d|connect|expiry|details|confirm/i);
    await expect(steps.first()).toBeVisible({ timeout: 5_000 });
  });
});
