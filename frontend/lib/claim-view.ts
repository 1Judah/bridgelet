import { AccountStatus } from '@/lib/api/types';
import { BridgeletApiError, getDefaultClient } from '@/lib/api/client';

/**
 * The claim view model rendered by `ClaimStatusCard`. Built from the
 * verified claim details plus locally-tracked redemption state.
 */
export interface ClaimView {
  status: AccountStatus;
  /** Claim amount in stroops. */
  amountStroops?: string;
  /** ISO 4217 asset code. */
  assetCode?: string;
  /** ISO 8601 expiry timestamp. */
  expiresAt?: string;
  /** Optional sender memo. */
  memo?: string;
  /** Developer-facing note from the redeem/verify response. */
  sweepNote?: string;
  /** Whether this session performed the claim. */
  claimedByMe?: boolean;
  /** Destination address used for this session's sweep. */
  sweepDestination?: string;
  /** Amount swept during this session, in stroops. */
  sweepAmountStroops?: string;
}

/**
 * Load the current view state for a claim token.
 *
 * Maps backend status codes onto the account lifecycle so the UI can render
 * the right panel:
 * - 200 → PENDING_CLAIM (verified, claimable)
 * - 401 → EXPIRED (token past its expiry timestamp)
 * - 409 → CLAIMED (already redeemed)
 * - 400 → PENDING_PAYMENT (malformed or not yet claimable)
 * - anything else → FAILED
 */
export async function loadClaimView(token: string): Promise<ClaimView> {
  try {
    const resp = await getDefaultClient().verifyClaim(token);
    return {
      status: AccountStatus.PENDING_CLAIM,
      amountStroops: resp.amountStroops,
      assetCode: resp.assetCode,
      expiresAt: resp.expiresAt,
      memo: resp.memo,
    };
  } catch (err) {
    if (err instanceof BridgeletApiError) {
      switch (err.statusCode) {
        case 401:
          return { status: AccountStatus.EXPIRED };
        case 409:
          return { status: AccountStatus.CLAIMED };
        case 400:
          return { status: AccountStatus.PENDING_PAYMENT };
        default:
          return { status: AccountStatus.FAILED };
      }
    }
    throw err;
  }
}

/**
 * Record that this session redeemed the given token. Kept as an explicit
 * side-effect hook so a future, persisted implementation can be dropped in
 * without touching call sites.
 */
export function markTokenClaimed(_token: string): void {}