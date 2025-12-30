"use client";

import { useState } from "react";
import { StepIndicator } from "./step-indicator";
import { CreateOrgStep } from "./steps/create-org-step";
import { InviteTeamStep } from "./steps/invite-team-step";

type Step = "create-org" | "invite-team";

const STEPS = [
  { id: "create-org", label: "Create org" },
  { id: "invite-team", label: "Invite team" },
];

interface OnboardingState {
  step: Step;
  organizationId: string | null;
  organizationName: string | null;
}

/**
 * OnboardingWizard - Container component managing the onboarding steps.
 */
export function OnboardingWizard() {
  const [state, setState] = useState<OnboardingState>({
    step: "create-org",
    organizationId: null,
    organizationName: null,
  });

  const handleOrgCreated = (orgId: string, orgName: string) => {
    setState({
      step: "invite-team",
      organizationId: orgId,
      organizationName: orgName,
    });
  };

  return (
    <div>
      {/* Welcome message */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome to athreei
        </h1>
        <p className="mt-2 text-gray-600">
          Let&apos;s get you set up in just a few steps
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator steps={STEPS} currentStep={state.step} />

      {/* Current step */}
      {state.step === "create-org" && (
        <CreateOrgStep onComplete={handleOrgCreated} />
      )}

      {state.step === "invite-team" &&
        state.organizationId &&
        state.organizationName && (
          <InviteTeamStep
            organizationId={state.organizationId}
            organizationName={state.organizationName}
          />
        )}
    </div>
  );
}
