import { AccountStatus } from '@/lib/api/types';
import { BridgeletApiError, type BridgeletClient } from '@/lib/api/client';
import { RequestTimeoutError } from '@/lib/fetch-with-timeout';

export interface SubmitClaimOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  pollTimeoutMs?: number;
  pollIntervalMs?: number;
}

export type SubmitClaimOutcome =
  /** The sweep completed on the server. */
  | { kind: 'success'; response: { isPartial: boolean; message?: string } }
  /** The token was already redeemed (HTTP 409). */
  | { kind: 'alreadyClaimed' }
  /** The request never reached the server — safe to resubmit. */
  | { kind: 'safeToRetry'; error?: { message?: string } }
  /** The submission may or may not have been received; poll for truth. */
  | { kind: 'ambiguous' }
  /** The server explicitly rejected the submission — do not retry. */
  | { kind: 'terminal'; error?: { message?: string; statusCode?: number } };

export interface SubmitClaimResult {
  outcome: SubmitClaimOutcome;
}

export interface PollStatusOptions {
  pollTimeoutMs?: number;
  pollIntervalMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
  return delay + Math.random() * delay;
}

/**
 * Submit a claim with bounded retry and double-submit prevention semantics.
 *
 * Retries are limited to failures that are safe to retry (network errors and
 * 5xx responses). A 4xx rejection is terminal. When retries are exhausted on
 * an ambiguous failure (a request that may have reached the server), we probe
 * with the idempotent `verifyClaim` call — the backend has no per-token
 * status endpoint — and report `alreadyClaimed` if the token has been
 * consumed, otherwise `ambiguous`.
 */
export async function submitClaimWithRetry(
  client: BridgeletClient,
  token: string,
  destinationAddress: string,
  options: SubmitClaimOptions = {},
): Promise<SubmitClaimResult> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1_000,
    maxDelayMs = 15_000,
    pollTimeoutMs = 30_000,
    pollIntervalMs = 2_000,
  } = options;

  const attempts = Math.max(1, maxAttempts);
  let lastNetworkError: unknown = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const resp = await client.redeemClaim(token, destinationAddress);
      return {
        outcome: {
          kind: 'success',
          response: {
            isPartial: resp.isPartial ?? false,
            message: resp.message ?? 'The payment has been claimed successfully.',
          },
        },
      };
    } catch (err) {
      if (err instanceof BridgeletApiError) {
        if (err.statusCode === 409) {
          return { outcome: { kind: 'alreadyClaimed' } };
        }
        if (err.statusCode >= 500 && attempt < attempts - 1) {
          await sleep(backoffDelay(attempt, baseDelayMs, maxDelayMs));
          continue;
        }
        return {
          outcome: {
            kind: 'terminal',
            error: { message: err.message, statusCode: err.statusCode },
          },
        };
      }

      // Non-HTTP failure (timeout or network error).
      lastNetworkError = err;
      if (attempt < attempts - 1) {
        await sleep(backoffDelay(attempt, baseDelayMs, maxDelayMs));
        continue;
      }
    }
  }

  // Retries exhausted on a network-ish failure. Timeouts are ambiguous (the
  // request may have been processed); a TypeError usually means the request
  // never left (safe to retry). Probe with the idempotent verify endpooint.
  if (lastNetworkError instanceof RequestTimeoutError) {
    try {
      const pollResult = await pollClaimStatus(client, token, { pollTimeoutMs, pollIntervalMs });
      if (
        pollResult.status === AccountStatus.CLAIMED ||
        pollResult.status === AccountStatus.PARTIAL_SWEEP
      ) {
        return { outcome: { kind: 'alreadyClaimed' } };
      }
      return { outcome: { kind: 'ambiguous' } };
    } catch {
      return { outcome: { kind: 'ambiguous' } };
    }
  }

  return {
    outcome: {
      kind: 'safeToRetry',
      error: { message: lastNetworkError instanceof Error ? lastNetworkError.message : undefined },
    },
  };
}

/**
 * Probe whether a claim token has been consumed by repeatedly calling the
 * idempotent `POST /claims/verify` endpoint (the backend has no per-token
 * status route) until it resolves to a terminal state or the deadline passes.
 * Returns the final observed status.
 */
export async function pollClaimStatus(
  client: BridgeletClient,
  token: string,
  options: PollStatusOptions = {},
): Promise<{ status: AccountStatus }> {
  const { pollTimeoutMs = 15_000, pollIntervalMs = 2_000 } = options;
  const deadline = Date.now() + pollTimeoutMs;
  let lastStatus: AccountStatus = AccountStatus.PENDING_CLAIM;

  while (Date.now() < deadline) {
    try {
      const verification = await client.verifyClaim(token);
      // A 200 always means "still claimable"; a `valid: false` payload is
      // treated like a pending/not-yet-claimable state.
      lastStatus =
        verification.valid === false ? AccountStatus.PENDING_PAYMENT : AccountStatus.PENDING_CLAIM;
    } catch (err) {
      // The verify endpoint signals terminal states with status codes:
      // 409 → already redeemed, 401 → expired.
      if (err instanceof BridgeletApiError) {
        if (err.statusCode === 409) {
          return { status: AccountStatus.CLAIMED };
        }
        if (err.statusCode === 401) {
          return { status: AccountStatus.EXPIRED };
        }
        if (err.statusCode === 400) {
          lastStatus = AccountStatus.PENDING_PAYMENT;
        }
      }
      // Transient errors: keep polling.
    }
    await sleep(pollIntervalMs);
  }

  return { status: lastStatus };
}