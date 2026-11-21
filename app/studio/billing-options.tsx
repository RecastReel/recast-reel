"use client";

import { useRef } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { CueKeyForm } from "../account/cue-key-form";
import { MonthlyPlanCard } from "../billing-buttons";
import { FreePlanCard } from "../free-plan-card";

export function StudioBillingOptions({
  purchased,
  subscribed,
  onKeySaved,
}: {
  purchased: boolean;
  subscribed: boolean;
  onKeySaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      {purchased ? (
        <p className="billing-notice" role="status">Your payment is being confirmed. If your balance has not updated, refresh shortly or contact support.</p>
      ) : subscribed && (
        <p className="billing-notice">You’ve used your available Recast Reel credits.</p>
      )}
      <div className="pricing studio-pricing" role="group" aria-label="Billing options">
        <FreePlanCard>
          <button type="button" className="button-primary" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
            Bring your own API key
          </button>
        </FreePlanCard>
        <MonthlyPlanCard subscribed={subscribed} />
      </div>
      <dialog ref={dialog} className="panel cue-key-dialog" aria-labelledby="cue-key-dialog-title" aria-describedby="cue-key-dialog-intro">
        <header className="cue-key-dialog-header">
          <h2 id="cue-key-dialog-title">Bring your own API key</h2>
          <button type="button" className="button-quiet" aria-label="Close API key setup" onClick={() => dialog.current?.close()}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <p id="cue-key-dialog-intro">Set up your account on MadeByCue, then paste and save your API key here. MadeByCue bills you directly for video generation.</p>
        <a className="button-quiet cue-key-provider-link" href="https://www.madebycue.dev/" target="_blank" rel="noreferrer" aria-label="Open madebycue.dev in a new tab">
          Open madebycue.dev <ArrowUpRight size={16} aria-hidden="true" />
        </a>
        <CueKeyForm onSaved={onKeySaved} />
      </dialog>
    </>
  );
}
