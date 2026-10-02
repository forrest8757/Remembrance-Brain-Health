// Form validator (CLAUDE.md §8). Each test registers its equivalence
// constraints; CI runs every registered bank and fails on any issue.
import { formSchema, type Form } from './form';

export interface FormIssue {
  formId: string;
  message: string;
}

/** Receives one form plus the whole bank (for cross-form equivalence checks). */
export type EquivalenceConstraint = (form: Form, bank: readonly Form[]) => string[];

export interface FormBank {
  testId: string;
  forms: readonly Form[];
  constraints: readonly EquivalenceConstraint[];
  /** Minimum original (unlicensed) forms required to ship (CLAUDE.md §14.4). */
  minOriginalForms: number;
}

export function validateBank(bank: FormBank): FormIssue[] {
  const issues: FormIssue[] = [];
  const ids = new Set<string>();

  for (const form of bank.forms) {
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      issues.push({ formId: form.formId, message: parsed.error.message });
      continue;
    }
    if (form.testId !== bank.testId) issues.push({ formId: form.formId, message: `testId ${form.testId} ≠ ${bank.testId}` });
    if (ids.has(form.formId)) issues.push({ formId: form.formId, message: 'duplicate formId' });
    ids.add(form.formId);
    for (const constraint of bank.constraints) {
      for (const message of constraint(form, bank.forms)) issues.push({ formId: form.formId, message });
    }
  }

  const originals = bank.forms.filter((f) => !f.licensed).length;
  if (originals < bank.minOriginalForms) {
    issues.push({ formId: '*', message: `needs ≥${bank.minOriginalForms} original forms, has ${originals}` });
  }
  return issues;
}
