"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { PortalConfig } from "@/types/i9";
import { useI9Form } from "@/hooks/useI9Form";
import StepPersonal from "@/components/form/StepPersonal";
import StepEligibility from "@/components/form/StepEligibility";
import StepDocuments from "@/components/form/StepDocuments";
import StepReview from "@/components/form/StepReview";

const STEP_LABELS = ["Personal Info", "Eligibility", "Documents", "Review"];

const DEFAULT_CONFIG: PortalConfig = {
  id: 0,
  businessName: "I-9 Verification Portal",
  logoFileKey: null,
  primaryColor: "#2563eb",
  accentColor: "#1e40af",
  notificationEmails: [],
  footerText: "",
  welcomeMessage: "Complete your I-9 Employment Eligibility Verification form below.",
  sendEmployeeConfirmation: false,
  useEVerify: null,
  employerName: "",
  employerTitle: "",
  employerBusinessName: "",
  employerBusinessAddress: "",
};

type TokenStatus = "idle" | "validating" | "valid" | "expired" | "used" | "not_found";

interface ValidatedInvite {
  emailHint: string | null;
  nameHint: string | null;
  isRenewal: boolean;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <HomePageInner />
    </Suspense>
  );
}

function HomePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [config, setConfig] = useState<PortalConfig>(DEFAULT_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Invite token state
  const [tokenInput, setTokenInput] = useState("");
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("idle");
  const [validatedInvite, setValidatedInvite] = useState<ValidatedInvite | null>(null);
  const validTokenRef = useRef<string | null>(null);

  const {
    formData,
    currentStep,
    errors,
    hydrated,
    updateField,
    goNext,
    goBack,
    resetForm,
  } = useI9Form({ useEVerify: config.useEVerify });

  // Redirect to admin setup if no admin account exists yet
  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => {
        if (!data.setupComplete) {
          router.replace("/admin");
        }
      })
      .catch(() => {});
  }, [router]);

  // Load portal config
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data: PortalConfig = await res.json();
          setConfig(data);
        }
      } catch {
        // Use defaults
      } finally {
        setConfigLoaded(true);
      }
    }
    loadConfig();
  }, []);

  // Validate token
  const validateToken = useCallback(async (token: string) => {
    setTokenStatus("validating");
    try {
      const res = await fetch("/api/invites/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await res.json();

      if (result.valid) {
        setTokenStatus("valid");
        setValidatedInvite({
          emailHint: result.emailHint,
          nameHint: result.nameHint,
          isRenewal: result.isRenewal,
        });
        validTokenRef.current = token;
      } else {
        setTokenStatus(result.reason as TokenStatus);
        setValidatedInvite(null);
        validTokenRef.current = null;
      }
    } catch {
      setTokenStatus("not_found");
      setValidatedInvite(null);
      validTokenRef.current = null;
    }
  }, []);

  // Check URL for token on mount
  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      setTokenInput(urlToken);
      validateToken(urlToken);
    }
  }, [searchParams, validateToken]);

  function handleTokenSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = tokenInput.trim();
    if (!trimmed) return;
    router.push(`/?token=${encodeURIComponent(trimmed)}`);
    validateToken(trimmed);
  }

  function handleTryDifferentCode() {
    setTokenInput("");
    setTokenStatus("idle");
    setValidatedInvite(null);
    validTokenRef.current = null;
    router.push("/");
  }

  function handleSubmitted() {
    setSubmitted(true);
    resetForm();
  }

  function handleStartOver() {
    setSubmitted(false);
    resetForm();
    handleTryDifferentCode();
  }

  // Don't render until localStorage is hydrated to avoid flicker
  if (!hydrated || !configLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const showForm = tokenStatus === "valid";
  const showError = tokenStatus === "expired" || tokenStatus === "used" || tokenStatus === "not_found";
  const showLanding = tokenStatus === "idle" || showError;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header
        className="border-b shadow-sm"
        style={{ backgroundColor: config.primaryColor }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          {config.logoFileKey && (
            <img
              src={`/api/uploads/${config.logoFileKey}`}
              alt={`${config.businessName} logo`}
              className="h-10 w-auto object-contain rounded"
            />
          )}
          <h1 className="text-lg font-semibold text-white">{config.businessName}</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {submitted ? (
          /* Success Screen */
          <div className="text-center py-16 space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">Submission Received</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Your I-9 form has been submitted successfully. Your employer will review your
              information and follow up if anything else is needed.
            </p>
            <button
              onClick={handleStartOver}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600
                border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Submit Another Form
            </button>
          </div>
        ) : tokenStatus === "validating" ? (
          /* Validating token */
          <div className="text-center py-16 space-y-4">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-600">Validating your invite code...</p>
          </div>
        ) : showLanding ? (
          /* Landing / Token Entry */
          <div className="max-w-md mx-auto py-12 space-y-8">
            <div className="text-center space-y-3">
              {config.logoFileKey && (
                <img
                  src={`/api/uploads/${config.logoFileKey}`}
                  alt={`${config.businessName} logo`}
                  className="h-16 w-auto object-contain mx-auto rounded"
                />
              )}
              <h2 className="text-2xl font-bold text-gray-900">{config.businessName}</h2>
              <p className="text-gray-600">
                I-9 Employment Eligibility Verification
              </p>
            </div>

            {/* Error message */}
            {showError && (
              <div className="p-4 rounded-lg border bg-red-50 border-red-200">
                <p className="text-sm font-medium text-red-800">
                  {tokenStatus === "expired" && "This invite link has expired. Please contact your employer for a new invite."}
                  {tokenStatus === "used" && "This invite link has already been used. If you need to submit another form, please contact your employer."}
                  {tokenStatus === "not_found" && "This invite code was not found. Please check the code and try again."}
                </p>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Enter Your Invite Code</h3>
              <p className="text-sm text-gray-500 mb-4">
                Paste the invite code or link provided by your employer to begin your I-9 form.
              </p>
              <form onSubmit={handleTokenSubmit} className="space-y-4">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste your invite code here"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  disabled={!tokenInput.trim()}
                  className="w-full py-2.5 px-4 rounded-lg text-white font-medium text-sm
                    transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: config.primaryColor }}
                >
                  Continue
                </button>
              </form>
            </div>
          </div>
        ) : showForm ? (
          <>
            {/* Renewal / invite info banner */}
            {validatedInvite && (validatedInvite.isRenewal || validatedInvite.nameHint) && (
              <div className="mb-6 p-3 rounded-lg border bg-blue-50 border-blue-200">
                <p className="text-sm text-blue-800">
                  {validatedInvite.isRenewal && (
                    <span className="font-medium">Reverification: </span>
                  )}
                  {validatedInvite.nameHint && (
                    <span>Welcome, {validatedInvite.nameHint}. </span>
                  )}
                  {validatedInvite.isRenewal
                    ? "Please complete the form below to update your I-9 verification."
                    : "Please complete the form below."}
                </p>
              </div>
            )}

            {/* Welcome message */}
            {config.welcomeMessage && currentStep === 1 && (
              <p className="text-sm text-gray-600 mb-6">{config.welcomeMessage}</p>
            )}

            {/* Step progress indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Step {currentStep} of 4: {STEP_LABELS[currentStep - 1]}
                </span>
                <span className="text-xs text-gray-400">{Math.round((currentStep / 4) * 100)}%</span>
              </div>
              <div className="flex gap-1.5">
                {STEP_LABELS.map((label, i) => (
                  <div
                    key={label}
                    className="h-2 flex-1 rounded-full transition-colors"
                    style={{
                      backgroundColor: i < currentStep ? config.primaryColor : "#e5e7eb",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Step content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              {currentStep === 1 && (
                <StepPersonal formData={formData} updateField={updateField} errors={errors} useEVerify={config.useEVerify === true} />
              )}
              {currentStep === 2 && (
                <StepEligibility formData={formData} updateField={updateField} errors={errors} />
              )}
              {currentStep === 3 && (
                <StepDocuments formData={formData} updateField={updateField} errors={errors} />
              )}
              {currentStep === 4 && (
                <StepReview
                  formData={formData}
                  onSubmitted={handleSubmitted}
                  inviteToken={validTokenRef.current ?? undefined}
                />
              )}
            </div>

            {/* Navigation buttons */}
            {currentStep < 4 && (
              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={currentStep === 1}
                  className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300
                    text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed
                    transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="px-5 py-2.5 text-sm font-medium rounded-lg text-white transition-colors"
                  style={{ backgroundColor: config.primaryColor }}
                >
                  Continue
                </button>
              </div>
            )}
            {currentStep === 4 && (
              <div className="flex justify-start mt-6">
                <button
                  type="button"
                  onClick={goBack}
                  className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300
                    text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              </div>
            )}
          </>
        ) : null}
      </main>

      {/* Footer */}
      {config.footerText && (
        <footer className="border-t py-4">
          <div className="max-w-4xl mx-auto px-4 text-center text-xs text-gray-400">
            {config.footerText}
          </div>
        </footer>
      )}
    </div>
  );
}
