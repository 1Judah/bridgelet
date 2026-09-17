'use client';

import { useState } from 'react';
import type { SendFormState } from '../index';
import { useNfc } from '@/hooks/use-nfc';

type ConfirmStepProps = {
  state: SendFormState;
  onBack: () => void;
};

export function ConfirmStep({ state, onBack }: ConfirmStepProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const { isSupported, writeUrl, isWriting, error: nfcError } = useNfc();

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      // Placeholder: wire up to POST /api/accounts + POST /send in a real impl.
      await new Promise((res) => setTimeout(res, 800));
      // Set a mock claim URL for the NFC experiment since the backend isn't wired
      setClaimUrl('https://bridgelet.example.com/claim/mock-token-123');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-green-200 bg-green-50 px-4 py-4"
      >
        <p className="font-medium text-green-800">Payment sent!</p>
        <p className="mt-1 text-sm text-green-700">
          A claim link has been sent to <strong>{state.recipientEmail}</strong>. They have 24
          hours to claim their funds.
        </p>

        {claimUrl && (
          <p className="mt-2 text-sm text-green-700">
            Send the recipient this link:{' '}
            <a
              href={claimUrl}
              data-testid="claim-link"
              className="font-medium underline underline-offset-2 hover:text-green-900"
            >
              {claimUrl}
            </a>
          </p>
        )}
        
        {isSupported && claimUrl && (
          <div className="mt-4 border-t border-green-200 pt-4">
            <button
              onClick={() => writeUrl(claimUrl)}
              disabled={isWriting}
              className="inline-flex items-center rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800 disabled:opacity-60"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {isWriting ? 'Ready to tap... hold tag to back of phone' : 'Write to NFC Tag'}
            </button>
            {nfcError && <p className="mt-2 text-xs text-red-600">{nfcError}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <dl className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="flex justify-between py-1.5">
          <dt className="font-medium text-slate-700">From wallet</dt>
          <dd className="max-w-[56%] break-all text-right font-mono text-xs text-slate-600">
            {state.publicKey}
          </dd>
        </div>
        <div className="flex justify-between py-1.5">
          <dt className="font-medium text-slate-700">Recipient</dt>
          <dd className="text-slate-600">{state.recipientEmail}</dd>
        </div>
        <div className="flex justify-between py-1.5">
          <dt className="font-medium text-slate-700">Amount</dt>
          <dd className="text-slate-600">
            {state.amountXlm} {state.assetCode}
          </dd>
        </div>
        {state.memo && (
          <div className="flex justify-between py-1.5">
            <dt className="font-medium text-slate-700">Memo</dt>
            <dd className="text-slate-600">{state.memo}</dd>
          </div>
        )}
      </dl>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {submitting ? 'Sending…' : 'Confirm & Send'}
        </button>
      </div>
    </div>
  );
}
