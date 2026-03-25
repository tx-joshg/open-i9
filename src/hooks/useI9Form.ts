"use client";

import { useState, useEffect, useCallback } from "react";
import type { I9FormData } from "@/types/i9";

const STORAGE_KEY = "i9-form-data";
const STEP_KEY = "i9-form-step";

const emptyForm: I9FormData = {
  lastName: "",
  firstName: "",
  middleInitial: "",
  otherLastNames: "",
  address: "",
  aptUnit: "",
  city: "",
  state: "",
  zip: "",
  dob: "",
  ssn: "",
  email: "",
  phone: "",
  citizenshipStatus: "",
  alienRegNumber: "",
  i94Number: "",
  foreignPassportNumber: "",
  passportCountry: "",
  authExpDate: "",
  attestationChecked: false,
  signatureDataUrl: "",
  signatureDate: "",
  docChoice: "",
  listADoc: "",
  listADocNumber: "",
  listAExpDate: "",
  listAFileKey: "",
  listAIssuingAuthority: "",
  listBDoc: "",
  listBDocNumber: "",
  listBExpDate: "",
  listBFileKey: "",
  listBIssuingAuthority: "",
  listCDoc: "",
  listCDocNumber: "",
  listCExpDate: "",
  listCFileKey: "",
  listCIssuingAuthority: "",
};

interface StepErrors {
  [field: string]: string;
}

function validateStep1(data: I9FormData, useEVerify = false): StepErrors {
  const errors: StepErrors = {};

  if (!data.lastName.trim()) errors.lastName = "Last name is required";
  if (!data.firstName.trim()) errors.firstName = "First name is required";
  if (!data.address.trim()) errors.address = "Address is required";
  if (!data.city.trim()) errors.city = "City is required";
  if (!data.state) errors.state = "State is required";

  if (!data.zip.trim()) {
    errors.zip = "ZIP code is required";
  } else if (!/^\d{5}(-\d{4})?$/.test(data.zip.trim())) {
    errors.zip = "ZIP must be 5 digits or 5+4 format (e.g. 12345-6789)";
  }

  if (!data.dob) {
    errors.dob = "Date of birth is required";
  } else {
    const dobDate = new Date(data.dob + "T00:00:00");
    if (dobDate > new Date()) {
      errors.dob = "Date of birth cannot be in the future";
    }
  }

  if (!data.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  const ssnDigits = data.ssn.replace(/\D/g, "");
  if (useEVerify) {
    if (!ssnDigits) {
      errors.ssn = "Social Security Number is required when using E-Verify";
    } else if (ssnDigits.length !== 9) {
      errors.ssn = "SSN must be 9 digits";
    }
  } else if (ssnDigits.length > 0 && ssnDigits.length !== 9) {
    errors.ssn = "SSN must be 9 digits";
  }

  return errors;
}

function validateStep2(data: I9FormData): StepErrors {
  const errors: StepErrors = {};

  if (!data.citizenshipStatus) {
    errors.citizenshipStatus = "You must select a citizenship/immigration status";
  }

  if (!data.attestationChecked) {
    errors.attestationChecked = "You must check the attestation";
  }

  if (!data.signatureDataUrl) {
    errors.signatureDataUrl = "Please sign the form";
  }

  if (data.citizenshipStatus === "lpr" && !data.alienRegNumber.trim()) {
    errors.alienRegNumber = "Alien Registration Number (A-Number) is required for LPRs";
  }

  if (data.citizenshipStatus === "authorized") {
    if (!data.authExpDate) {
      errors.authExpDate = "Authorization expiration date is required";
    }
    const hasAlien = data.alienRegNumber.trim();
    const hasI94 = data.i94Number.trim();
    const hasPassport = data.foreignPassportNumber.trim();
    if (!hasAlien && !hasI94 && !hasPassport) {
      errors.alienRegNumber =
        "Provide at least one: Alien Registration Number, I-94 Number, or Foreign Passport Number";
    }
  }

  return errors;
}

function validateStep3(data: I9FormData): StepErrors {
  const errors: StepErrors = {};

  if (!data.docChoice) {
    errors.docChoice = "Select a document list option";
    return errors;
  }

  if (data.docChoice === "listA") {
    if (!data.listADoc) errors.listADoc = "Select a document type";
    if (!data.listADocNumber.trim()) errors.listADocNumber = "Document number is required";
    if (!data.listAFileKey) errors.listAFileKey = "Upload a copy of this document";
  }

  if (data.docChoice === "listBC") {
    if (!data.listBDoc) errors.listBDoc = "Select a List B document type";
    if (!data.listBDocNumber.trim()) errors.listBDocNumber = "List B document number is required";
    if (!data.listBFileKey) errors.listBFileKey = "Upload a copy of the List B document";
    if (!data.listCDoc) errors.listCDoc = "Select a List C document type";
    if (!data.listCDocNumber.trim()) errors.listCDocNumber = "List C document number is required";
    if (!data.listCFileKey) errors.listCFileKey = "Upload a copy of the List C document";
  }

  return errors;
}

export function useI9Form(options?: { useEVerify?: boolean | null }) {
  const useEVerify = options?.useEVerify === true;
  const [formData, setFormData] = useState<I9FormData>(emptyForm);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<StepErrors>({});
  const [hydrated, setHydrated] = useState(false);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<I9FormData>;
        setFormData((prev) => ({ ...prev, ...parsed }));
      }
      const savedStep = localStorage.getItem(STEP_KEY);
      if (savedStep) {
        const step = parseInt(savedStep, 10);
        if (step >= 1 && step <= 4) setCurrentStep(step);
      }
    } catch {
      // ignore corrupt data
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STEP_KEY, String(currentStep));
  }, [currentStep, hydrated]);

  const updateField = useCallback(
    <K extends keyof I9FormData>(field: K, value: I9FormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear the error for this field when the user changes it
      setErrors((prev) => {
        if (prev[field]) {
          const next = { ...prev };
          delete next[field];
          return next;
        }
        return prev;
      });
    },
    []
  );

  const validateCurrentStep = useCallback((): boolean => {
    let stepErrors: StepErrors = {};
    switch (currentStep) {
      case 1:
        stepErrors = validateStep1(formData, useEVerify);
        break;
      case 2:
        stepErrors = validateStep2(formData);
        break;
      case 3:
        stepErrors = validateStep3(formData);
        break;
      case 4:
        // Review step — no extra validation
        break;
    }
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }, [currentStep, formData, useEVerify]);

  const goNext = useCallback(() => {
    if (validateCurrentStep() && currentStep < 4) {
      setCurrentStep((s) => s + 1);
    }
  }, [validateCurrentStep, currentStep]);

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setErrors({});
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const resetForm = useCallback(() => {
    setFormData(emptyForm);
    setCurrentStep(1);
    setErrors({});
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STEP_KEY);
  }, []);

  return {
    formData,
    currentStep,
    errors,
    hydrated,
    updateField,
    goNext,
    goBack,
    resetForm,
    validateCurrentStep,
  };
}
