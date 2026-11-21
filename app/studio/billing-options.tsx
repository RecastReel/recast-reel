"use client";

import { useRef } from "react";
import { X } from "lucide-react";
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
        <p id="cue-key-dialog-intro">MadeByCue provides the video API and bills you directly for generation.</p>
        <ol>
          <li><a href="https://www.madebycue.dev/signup" target="_blank" rel="noreferrer">Create a MadeByCue account</a> or sign in if you already have one.</li>
          <li><a href="https://www.madebycue.dev/billing" target="_blank" rel="noreferrer">Add credits in MadeByCue Billing</a> to pay for video generation.</li>
          <li><a href="https://www.madebycue.dev/keys" target="_blank" rel="noreferrer">Create and copy an API key</a>, then paste it below.</li>
        </ol>
        <CueKeyForm onSaved={onKeySaved} />
      </dialog>
    </>
  );
}
