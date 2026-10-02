export * from './schema';
export { toyColorsSpec } from './tests/toy-colors';
export { numberSpanSpec } from './tests/number-span/spec';
export { mocaSpec, MOCA_MISSING_PHRASES } from './tests/moca/spec';
export { categoryFluencySpec } from './tests/category-fluency/spec';
export { oralTrailsSpec } from './tests/oral-trails/spec';
export { phonemicFluencySpec } from './tests/phonemic-fluency/spec';
export { storyImmediateSpec, storyDelayedSpec } from './tests/story/spec';
export { hearingCheckSpec, HEARING_SENTENCE } from './tests/hearing-check/spec';

import { toyColorsSpec } from './tests/toy-colors';
import { numberSpanSpec } from './tests/number-span/spec';
import { mocaSpec } from './tests/moca/spec';
import { categoryFluencySpec } from './tests/category-fluency/spec';
import { oralTrailsSpec } from './tests/oral-trails/spec';
import { phonemicFluencySpec } from './tests/phonemic-fluency/spec';
import { storyImmediateSpec, storyDelayedSpec } from './tests/story/spec';
import { hearingCheckSpec } from './tests/hearing-check/spec';
import type { TestSpec } from './schema';

/** Every spec in the product. The clip pre-renderer walks this list. */
export const ALL_SPECS: readonly TestSpec[] = [toyColorsSpec, numberSpanSpec, mocaSpec, categoryFluencySpec, oralTrailsSpec, phonemicFluencySpec, storyImmediateSpec, storyDelayedSpec, hearingCheckSpec];
