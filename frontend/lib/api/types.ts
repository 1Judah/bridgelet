/**
 * Frontend-facing API types shared with bridgelet-sdk.
 *
 * `AccountStatus` mirrors the backend's real lifecycle enum — see
 * bridgelet-sdk `src/modules/accounts/enums/account-status.enum.ts` —
 * instead of an old three-value `'available' | 'claimed' | 'expired'`
 * model that had no way to represent INITIALIZING, PENDING_PAYMENT,
 * CLAIMING, PARTIAL_SWEEP, or FAILED accounts.
 */
export enum AccountStatus {
  INITIALIZING = 'initializing',
  PENDING_PAYMENT = 'pending_payment',
  PENDING_CLAIM = 'pending_claim',
  CLAIMING = 'claiming',
  PARTIAL_SWEEP = 'partial_sweep',
  CLAIMED = 'claimed',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

/**
 * Verified claim details returned by POST /claims/verify when a token is
 * valid (HTTP 200). Mirrors the backend's claim-verification payload.
 */
export interface VerifyClaimResponse {
  /** Whether the claim token is valid and not yet redeemed. */
  valid: boolean;
  /** Backend account id hosting the claim, when known. */
  accountId?: string;
  /** Claim amount in stroops (1 XLM = 10_000_000). */
  amountStroops: string;
  /** ISO 4217 asset code, e.g. "XLM" or "USDC". */
  assetCode: string;
  /** ISO 8601 timestamp after which the token expires. */
  expiresAt: string;
  /** Optional sender memo. */
  memo?: string;
}

/** Response from POST /claims/redeem — the result of a sweep. */
export interface RedeemClaimResponse {
  /** Whether the sweep completed successfully. */
  success: boolean;
  /** Stellar transaction hash when a transaction was submitted. */
  txHash?: string;
  /** Amount swept, in decimal units (e.g. "100.0000000"). */
  amountSwept?: string;
  /** Asset code that was swept. */
  asset?: string;
  /** Destination Stellar address the funds were swept to. */
  destination?: string;
  /** ISO 8601 timestamp the sweep completed at. */
  sweptAt?: string;
  /** Human-readable summary, e.g. "Payment claimed." */
  message?: string;
  /** Whether only part of the balance could be swept. */
  isPartial?: boolean;
}

/**
 * Mirrors bridgelet-sdk's `AccountResponseDto`
 * (src/modules/accounts/dto/account-response.dto.ts), with Date fields
 * serialized to ISO strings as they arrive over JSON.
 */
export interface AccountResponse {
  accountId: string;
  publicKey: string;
  claimUrl: string | null;
  txHash?: string;
  amount: string;
  asset: string;
  status: AccountStatus;
  expiresAt: string;
  createdAt: string;
  claimedAt?: string | null;
  destination?: string;
  metadata?: Record<string, unknown>;
}