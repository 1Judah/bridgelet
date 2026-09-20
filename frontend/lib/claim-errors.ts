// #114 – Typed claim failure modes with user-facing messages
export type ClaimErrorCode =
  | 'TOKEN_NOT_FOUND'
  | 'ALREADY_CLAIMED'
  | 'EXPIRED'
  | 'INVALID_ADDRESS'
  | 'NETWORK_ERROR'
  | 'SWEEP_FAILED'
  | 'SUBMISSION_FAILED_RETRYABLE'
  | 'SUBMISSION_TIMEOUT'
  | 'SUBMISSION_FAILED_FINAL';

export class ClaimError extends Error {
  /** Whether re-submitting this claim is safe (e.g. the request never reached the server). */
  public readonly retryable: boolean;

  constructor(public readonly code: ClaimErrorCode, message: string, retryable = false) {
    super(message);
    this.name = 'ClaimError';
    this.retryable = retryable;
  }
}

const MESSAGES: Record<ClaimErrorCode, string> = {
  TOKEN_NOT_FOUND:  'This claim link is invalid or no longer exists.',
  ALREADY_CLAIMED:  'This payment has already been claimed.',
  EXPIRED:          'This claim link has expired. Contact the sender for a new one.',
  INVALID_ADDRESS:  'The destination address is not a valid Stellar public key.',
  NETWORK_ERROR:    'A network error occurred. Please check your connection and try again.',
  SWEEP_FAILED:     'The transfer could not be completed. Please try again or contact support.',
  SUBMISSION_FAILED_RETRYABLE:
    'Your claim could not be sent right now. Please try again -- this is safe and will not cause any problems.',
  SUBMISSION_TIMEOUT:
    'Your claim is taking longer than expected due to network congestion. We are checking on it -- please wait a moment.',
  SUBMISSION_FAILED_FINAL:
    'Something went wrong after several attempts. Your funds are safe, but we need our team to look into this.',
};

export function getClaimErrorMessage(code: ClaimErrorCode): string {
  return MESSAGES[code];
}

export function toClaimError(status: number): ClaimError {
  if (status === 404) return new ClaimError('TOKEN_NOT_FOUND', MESSAGES.TOKEN_NOT_FOUND);
  if (status === 409) return new ClaimError('ALREADY_CLAIMED', MESSAGES.ALREADY_CLAIMED);
  if (status === 410) return new ClaimError('EXPIRED', MESSAGES.EXPIRED);
  return new ClaimError('NETWORK_ERROR', MESSAGES.NETWORK_ERROR);
}
