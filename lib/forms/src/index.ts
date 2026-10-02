export * from './form';
export * from './random';
export * from './assignment';
export * from './collisions';
export * from './validator';
export { toyColorsForms, toyColorsBank, BASIC_COLORS } from './tests/toy-colors';
export * from './tests/number-span';
export * from './tests/moca';
export * from './tests/category-fluency';
export * from './tests/oral-trails';
export * from './tests/phonemic-fluency';
export * from './tests/story';
export * from './tests/hearing-check';

import { toyColorsBank } from './tests/toy-colors';
import { numberSpanBank } from './tests/number-span';
import { mocaBank } from './tests/moca';
import { categoryFluencyBank } from './tests/category-fluency';
import { oralTrailsBank } from './tests/oral-trails';
import { phonemicFluencyBank } from './tests/phonemic-fluency';
import { storyBank } from './tests/story';
import { hearingCheckBank } from './tests/hearing-check';
import type { FormBank } from './validator';

/** Every bank the CI validator checks. Register new tests here. */
export const ALL_BANKS: readonly FormBank[] = [toyColorsBank, numberSpanBank, mocaBank, categoryFluencyBank, oralTrailsBank, phonemicFluencyBank, storyBank, hearingCheckBank];
