// The hearing check has no content to rotate: one fixed sentence (in the spec).
import { defineForm, type Form } from '../form';
import type { FormBank } from '../validator';

export const hearingCheckForms: Form[] = [defineForm({ formId: 'hearing-check.1', testId: 'hearing-check', version: '1.0.0', licensed: false, items: { none: ['-'] }, equated: true })];

export const hearingCheckBank: FormBank = { testId: 'hearing-check', forms: hearingCheckForms, constraints: [], minOriginalForms: 1 };
