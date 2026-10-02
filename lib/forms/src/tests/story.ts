// T2 Story Recall forms: four Remembrance-original stories. Craft Story 21
// (the NACC story) needs the author's permission and is not used or stored
// (CLAUDE.md §8). Each original follows the build doc's structure:
// named adult (possessive) → named child → recurring activity → day → time →
// a place near home → joining others → "one …" event → object goes where it
// shouldn't → a place with animals → their keeper hears a noise → comes →
// helps → retrieves the object. Exactly 44 verbatim bits and 25 paraphrase
// units, 7 of them "required word" units, like the reference story.
import { defineForm, type Form } from '../form';
import type { EquivalenceConstraint, FormBank } from '../validator';

/** A paraphrase unit: the general rule, 1-point phrases, 0-point examples. */
export interface StoryUnit {
  label: string;
  rule: string;
  /** Phrases that earn the point (matched on lemmas, articles ignored). Must include the story's own word(s). */
  accept: string[];
  /** 0-point examples (documentation and tests: none may match `accept`). */
  reject: string[];
  /** A "required word" unit (the exact word is needed, like "One day"). */
  required: boolean;
  /** 1-based verbatim bits this unit spans. */
  bits: number[];
}

/** Unit → bits, shared by every story (the structure is fixed). */
export const UNIT_BITS: number[][] = [
  [1], [2], [3], [4], [5], [6, 7], [8], [9, 10, 11, 12], [13, 14, 15], [16], [17], [18, 19], [20, 21], [22], [23, 24],
  [25, 26, 27], [28], [29], [30], [31, 32, 33], [34, 35], [36, 37, 38], [39, 40], [41, 42], [43, 44],
];
/** Required-word units (1-based): the activity verb and noun, the group, "One …", the object, the preposition, the number. */
export const REQUIRED_UNITS = [4, 5, 11, 12, 14, 16, 19];

/** Reference counts of the NACC story (measured only; its text isn't stored): ±3 words, ±5% syllables. */
export const REFERENCE = { words: 56, syllables: 75 } as const;

type UnitRow = [rule: string, accept: string[], reject: string[]];

function storyForm(
  formId: string,
  cueSubject: string,
  bits: [text: string, word: string][],
  units: UnitRow[],
): Form {
  const story = bits.map(([t]) => t).join(' ');
  const encoded: StoryUnit[] = units.map(([rule, accept, reject], k) => ({
    label: UNIT_BITS[k]!.map((b) => bits[b - 1]?.[0] ?? '').join(' ').replace(/[.,]/g, ''),
    rule,
    accept,
    reject,
    required: REQUIRED_UNITS.includes(k + 1),
    bits: UNIT_BITS[k]!,
  }));
  return defineForm({
    formId,
    testId: 'story-immediate',
    version: '1.0.0',
    licensed: false,
    items: {
      story: [story],
      bits: bits.map(([t]) => t),
      bitWords: bits.map(([, w]) => w),
      cueSubject: [cueSubject],
      units: encoded.map((u) => JSON.stringify(u)),
    },
    equivalence: { bits: bits.length, units: units.length },
    equated: false,
  });
}

/** The paraphrase rubric of a form. */
export function storyUnits(form: Form): StoryUnit[] {
  return (form.items.units ?? []).map((u) => JSON.parse(u) as StoryUnit);
}

export const storyForms: Form[] = [
  storyForm(
    'story.1',
    'a young boy',
    [
      ["Helen's", 'helen'], ['son', 'son'], ['Tommy', 'tommy'], ['flew', 'flew'], ['kites', 'kites'], ['every', 'every'],
      ['Saturday', 'saturday'], ['at noon.', 'noon'], ['He', 'he'], ['loved', 'loved'], ['running', 'running'], ['to the field', 'field'],
      ['across from', 'across'], ['their', 'their'], ['home', 'home'], ['and meeting', 'meeting'], ['his friends.', 'friends'],
      ['One', 'one'], ['spring,', 'spring'], ['he', 'he'], ['pulled', 'pulled'], ['the string', 'string'], ['so', 'so'], ['fast', 'fast'],
      ['that the kite', 'kite'], ['drifted', 'drifted'], ['into', 'into'], ["the farmer's", 'farmer'], ['barn', 'barn'],
      ['where four', 'four'], ['noisy', 'noisy'], ['geese', 'geese'], ['nested.', 'nested'], ["The geese's", 'geese'], ['keeper', 'keeper'],
      ['heard', 'heard'], ['sharp', 'sharp'], ['honking,', 'honking'], ['ran', 'ran'], ['out,', 'out'], ['and helped', 'helped'],
      ['them', 'them'], ['free', 'free'], ['the kite.', 'kite'],
    ],
    [
      ['"Helen" or a variant of the name', ['helen', 'helena', 'nell', 'nellie'], ['hannah', 'heather']],
      ['"son" or a word for a young boy', ['son', 'boy', 'kid', 'child', 'young man'], ['daughter', 'dad', 'a baby']],
      ['"Tommy" or a variant of the name', ['tommy', 'tom', 'thomas', 'tommie'], ['timmy', 'tony', 'teddy']],
      ['"flew" required (any form of "fly")', ['flew', 'fly', 'flying', 'flown'], ['made kites', 'bought kites', 'played with kites']],
      ['"kites" required', ['kite'], ['balloons', 'paper planes', 'a drone']],
      ['"Saturday", or an indication it was on the weekend', ['saturday', 'weekend'], ['every day', 'on Sundays', 'on Fridays']],
      ['an indication it was around midday', ['noon', 'midday', 'lunchtime', 'lunch time', 'twelve'], ['in the morning', 'after school', 'at night']],
      ['an indication he went to an open, grassy area outdoors', ['field', 'meadow', 'pasture', 'grassy', 'park'], ['to school', 'to the gym', 'to the beach']],
      ['"home" or a word for a home', ['home', 'house', 'cottage', 'where they lived'], ['the store', 'the church', 'the barn']],
      ['an indication he met up with others', ['meeting', 'met', 'joined', 'hung out', 'played with'], ['watched', 'waved at']],
      ['"friends" required', ['friend'], ['the kids', 'his cousins', 'his brothers']],
      ['"One spring" required', ['one spring'], ['one day', 'one summer', 'that spring']],
      ['an indication he pulled', ['pulled', 'pull', 'tugged', 'yanked', 'jerked'], ['let go', 'dropped it', 'cut it']],
      ['"string" required', ['string'], ['the rope', 'the cord', 'the tail']],
      ['an indication of speed or force', ['fast', 'quickly', 'quick', 'hard', 'strongly', 'rapidly'], ['slowly', 'gently']],
      ['"into" required', ['into'], ['onto', 'near', 'over']],
      ['an indication the land belonged to a farmer', ['farmer', 'farm'], ["the neighbor's", "a friend's", "the teacher's"]],
      ['"barn" or a word for a farm building', ['barn', 'shed', 'stable', 'coop'], ['the garden', 'the forest', 'the house']],
      ['"four" required', ['four'], ['three geese', 'five geese', 'some geese']],
      ['an indication that geese were there', ['geese', 'goose', 'gander'], ['ducks', 'chickens', 'swans', 'dogs']],
      ['an indication of a person who looked after the geese', ['keeper', 'owner', 'caretaker', 'looked after', 'took care'], ['a bystander', 'the police', 'a passerby']],
      ['an indication the geese were making noise', ['honking', 'honk', 'squawking', 'squawk', 'noise', 'loud', 'heard geese'], ['saw the geese', 'the geese ran around']],
      ['an indication the keeper came', ['ran out', 'rushed out', 'hurried', 'came over', 'came out', 'showed up'], ['stayed inside', 'called the police']],
      ['an indication help was given', ['helped', 'help', 'helping', 'assisted', 'aided'], ['watched them', 'laughed at them']],
      ['an indication the kite was freed or returned', ['free', 'freed', 'untangle', 'got kite back', 'get kite back', 'rescued kite', 'returned kite', 'gave him kite'], ['lost the kite', 'broke the kite']],
    ],
  ),
  storyForm(
    'story.2',
    'a young girl',
    [
      ["Ruth's", 'ruth'], ['daughter', 'daughter'], ['Lily', 'lily'], ['rode', 'rode'], ['bikes', 'bikes'], ['every', 'every'],
      ['Sunday', 'sunday'], ['at nine.', 'nine'], ['She', 'she'], ['enjoyed', 'enjoyed'], ['cycling', 'cycling'], ['to the park', 'park'],
      ['beside', 'beside'], ['their', 'their'], ['flat', 'flat'], ['and racing', 'racing'], ['the other kids.', 'kids'],
      ['One', 'one'], ['morning,', 'morning'], ['she', 'she'], ['waved', 'waved'], ['her hat', 'hat'], ['so', 'so'], ['fast', 'fast'],
      ['that it', 'it'], ['flew', 'flew'], ['under', 'under'], ["the baker's", 'baker'], ['wagon', 'wagon'], ['where two', 'two'],
      ['gray', 'gray'], ['cats', 'cats'], ['napped.', 'napped'], ["The cats'", 'cats'], ['owner', 'owner'], ['heard', 'heard'],
      ['soft', 'soft'], ['hissing,', 'hissing'], ['stepped', 'stepped'], ['out,', 'out'], ['and helped', 'helped'], ['her', 'her'],
      ['reach', 'reach'], ['the hat.', 'hat'],
    ],
    [
      ['"Ruth" or a variant of the name', ['ruth', 'ruthie', 'ruthy'], ['rachel', 'rita']],
      ['"daughter" or a word for a young girl', ['daughter', 'girl', 'kid', 'child', 'young lady'], ['son', 'mom', 'a baby']],
      ['"Lily" or a variant of the name', ['lily', 'lilly', 'lil', 'lillian'], ['lucy', 'linda', 'molly']],
      ['"rode" required (any form of "ride")', ['rode', 'ride', 'riding', 'ridden'], ['fixed bikes', 'washed bikes', 'pushed bikes']],
      ['"bikes" required', ['bike', 'bicycle'], ['scooters', 'skates', 'a horse']],
      ['"Sunday", or an indication it was on the weekend', ['sunday', 'weekend'], ['every day', 'on Mondays', 'on Saturdays']],
      ['an indication it was in the morning', ['nine', 'morning', 'early', 'breakfast'], ['in the evening', 'after school', 'at night']],
      ['an indication she went to a park or open play area', ['park', 'playground', 'green'], ['to school', 'to the mall', 'to the gym']],
      ['"flat" or a word for a home', ['flat', 'apartment', 'home', 'house', 'where they lived'], ['the store', 'the library', 'the bakery']],
      ['an indication she raced or competed with others', ['racing', 'raced', 'race', 'competed', 'played with'], ['watched', 'waved at']],
      ['"kids" required', ['kid'], ['her friends', 'the boys', 'her cousins']],
      ['"One morning" required', ['one morning'], ['one day', 'one afternoon', 'that morning']],
      ['an indication she waved or swung something', ['waved', 'wave', 'swung', 'flapped', 'shook'], ['dropped it', 'threw it', 'put it down']],
      ['"hat" required', ['hat'], ['her scarf', 'her cap', 'her helmet']],
      ['an indication of speed or strong movement', ['fast', 'quickly', 'wildly', 'wild', 'hard', 'a lot'], ['gently', 'slowly']],
      ['"under" required', ['under', 'underneath'], ['onto', 'behind', 'inside']],
      ['an indication the vehicle belonged to a baker', ['baker', 'bakery', 'bread man'], ["the neighbor's", "the mailman's", "a friend's"]],
      ['"wagon" or a word for a cart', ['wagon', 'cart', 'trailer'], ['the car', 'the bench', 'the house']],
      ['"two" required', ['two'], ['three cats', 'one cat', 'some cats']],
      ['an indication that cats were there', ['cat', 'kitty', 'kitties', 'kitten'], ['dogs', 'birds', 'rabbits']],
      ['an indication of a person responsible for the cats', ['owner', 'keeper', 'caretaker', 'took care', 'whose cats'], ['a bystander', 'the police', 'a stranger']],
      ['an indication the cats were making noise', ['hissing', 'hiss', 'hissed', 'meowing', 'noise', 'heard cats'], ['saw the cats', 'the cats ran off']],
      ['an indication the owner came', ['stepped out', 'stepped outside', 'came out', 'went outside', 'showed up'], ['stayed inside', 'called the police']],
      ['an indication help was given', ['helped', 'help', 'helping', 'assisted', 'aided'], ['watched her', 'laughed at her']],
      ['an indication she got the hat back', ['reach hat', 'got hat back', 'get hat back', 'grabbed hat', 'got hat', 'returned hat', 'gave her hat', 'pulled out hat'], ['lost the hat', 'left the hat']],
    ],
  ),
  storyForm(
    'story.3',
    'a young boy',
    [
      ["George's", 'george'], ['nephew', 'nephew'], ['Danny', 'danny'], ['swam', 'swam'], ['laps', 'laps'], ['every', 'every'],
      ['Tuesday', 'tuesday'], ['at five.', 'five'], ['He', 'he'], ['enjoyed', 'enjoyed'], ['walking', 'walking'], ['to the lake', 'lake'],
      ['near', 'near'], ['their', 'their'], ['cabin', 'cabin'], ['and meeting', 'meeting'], ['the team.', 'team'], ['One', 'one'],
      ['evening,', 'evening'], ['he', 'he'], ['threw', 'threw'], ['the frisbee', 'frisbee'], ['so', 'so'], ['far', 'far'], ['that it', 'it'],
      ['sailed', 'sailed'], ['onto', 'onto'], ["the ranger's", 'ranger'], ['dock', 'dock'], ['where six', 'six'], ['proud', 'proud'],
      ['swans', 'swans'], ['floated.', 'floated'], ["The swans'", 'swans'], ['caretaker', 'caretaker'], ['heard', 'heard'], ['angry', 'angry'],
      ['squawking,', 'squawking'], ['rowed', 'rowed'], ['out,', 'out'], ['and helped', 'helped'], ['them', 'them'], ['fetch', 'fetch'],
      ['the frisbee.', 'frisbee'],
    ],
    [
      ['"George" or a variant of the name', ['george', 'georgie', 'jorge'], ['gerald', 'greg']],
      ['"nephew" or a word for a young boy', ['nephew', 'boy', 'kid', 'young man'], ['niece', 'uncle', 'children']],
      ['"Danny" or a variant of the name', ['danny', 'dan', 'daniel', 'dannie'], ['donny', 'denny', 'david']],
      ['"swam" required (any form of "swim")', ['swam', 'swim', 'swimming', 'swum'], ['ran laps', 'walked laps', 'rowed laps']],
      ['"laps" required', ['lap'], ['races', 'miles', 'lengths of the pool']],
      ['"Tuesday", or an indication it was on a weekday', ['tuesday', 'weekday'], ['every day', 'on Saturdays', 'on Thursdays']],
      ['an indication it was late in the afternoon', ['five', 'afternoon', 'after work', 'after school', 'late in the day'], ['in the morning', 'at noon', 'at night']],
      ['an indication he went to a lake or pond', ['lake', 'pond', 'water', 'shore'], ['to the pool', 'to the beach', 'to the gym']],
      ['"cabin" or a word for a home', ['cabin', 'cottage', 'house', 'home', 'lodge', 'where they lived'], ['the store', 'the boathouse', 'the school']],
      ['an indication he met up with others', ['meeting', 'met', 'joined', 'played with', 'hung out'], ['watched', 'waved at']],
      ['"team" required', ['team'], ['his friends', 'the club', 'the kids']],
      ['"One evening" required', ['one evening'], ['one day', 'one night', 'that evening']],
      ['an indication he threw something', ['threw', 'throw', 'tossed', 'flung', 'hurled'], ['kicked it', 'dropped it', 'caught it']],
      ['"frisbee" required', ['frisbee'], ['the ball', 'the disc golf bag', 'a stick']],
      ['an indication of distance or force', ['far', 'hard', 'long way', 'strongly', 'too far'], ['a little', 'gently']],
      ['"onto" required', ['onto', 'on to'], ['into', 'over', 'near']],
      ['an indication the dock belonged to a ranger', ['ranger', 'park ranger', 'warden'], ["the neighbor's", "the fisherman's", "a friend's"]],
      ['"dock" or a word for a pier', ['dock', 'pier', 'jetty', 'wharf'], ['the boat', 'the beach', 'the bridge']],
      ['"six" required', ['six'], ['five swans', 'seven swans', 'some swans']],
      ['an indication that swans were there', ['swan'], ['ducks', 'geese', 'fish']],
      ['an indication of a person responsible for the swans', ['caretaker', 'keeper', 'owner', 'took care', 'looked after'], ['a bystander', 'the police', 'a swimmer']],
      ['an indication the swans were making noise', ['squawking', 'squawk', 'honking', 'hissing', 'noise', 'heard swans'], ['saw the swans', 'the swans swam away']],
      ['an indication the caretaker came', ['rowed out', 'rowed', 'paddled', 'came out', 'came over', 'showed up'], ['stayed inside', 'called the police']],
      ['an indication help was given', ['helped', 'help', 'helping', 'assisted', 'aided'], ['watched them', 'laughed at them']],
      ['an indication they got the frisbee back', ['fetch', 'fetched', 'got frisbee back', 'get frisbee back', 'got frisbee', 'returned frisbee', 'gave him frisbee', 'brought frisbee back'], ['lost the frisbee', 'broke the frisbee']],
    ],
  ),
  storyForm(
    'story.4',
    'a young girl',
    [
      ["Martha's", 'martha'], ['niece', 'niece'], ['Rosie', 'rosie'], ['tossed', 'tossed'], ['horseshoes', 'horseshoes'], ['every', 'every'],
      ['Friday', 'friday'], ['at six.', 'six'], ['She', 'she'], ['loved', 'loved'], ['skipping', 'skipping'], ['to the barn', 'barn'],
      ['behind', 'behind'], ['their', 'their'], ['farmhouse', 'farmhouse'], ['and beating', 'beating'], ['her cousins.', 'cousins'],
      ['One', 'one'], ['summer,', 'summer'], ['she', 'she'], ['flung', 'flung'], ['a horseshoe', 'horseshoe'], ['so', 'so'], ['high', 'high'],
      ['that it', 'it'], ['landed', 'landed'], ['inside', 'inside'], ["the vet's", 'vet'], ['pen', 'pen'], ['where five', 'five'],
      ['brown', 'brown'], ['goats', 'goats'], ['grazed.', 'grazed'], ["The goats'", 'goats'], ['keeper', 'keeper'], ['heard', 'heard'],
      ['loud', 'loud'], ['bleats,', 'bleats'], ['rushed', 'rushed'], ['in,', 'in'], ['and helped', 'helped'], ['her', 'her'],
      ['grab', 'grab'], ['the horseshoe.', 'horseshoe'],
    ],
    [
      ['"Martha" or a variant of the name', ['martha', 'marty', 'mattie'], ['marsha', 'mary']],
      ['"niece" or a word for a young girl', ['niece', 'girl', 'kid', 'young lady'], ['nephew', 'aunt', 'children']],
      ['"Rosie" or a variant of the name', ['rosie', 'rose', 'rosa', 'rosalie'], ['ruthie', 'josie', 'roxy']],
      ['"tossed" required (any form of "toss")', ['tossed', 'toss', 'tossing'], ['collected horseshoes', 'painted horseshoes', 'found horseshoes']],
      ['"horseshoes" required', ['horseshoe'], ['rings', 'beanbags', 'balls']],
      ['"Friday", or an indication it was at the end of the week', ['friday', 'end of the week'], ['every day', 'on Mondays', 'on Saturdays']],
      ['an indication it was in the evening', ['six', 'evening', 'dinnertime', 'supper', 'after work'], ['in the morning', 'at noon', 'at lunch']],
      ['an indication she went to a barn or farm building', ['barn', 'stable', 'shed'], ['to school', 'to the field', 'to the store']],
      ['"farmhouse" or a word for a home', ['farmhouse', 'farm house', 'house', 'home', 'where they lived'], ['the store', 'the school', 'the church']],
      ['an indication she played against others', ['beating', 'beat', 'won against', 'competed', 'played against', 'played with'], ['watched', 'waved at']],
      ['"cousins" required', ['cousin'], ['her friends', 'her sisters', 'the kids']],
      ['"One summer" required', ['one summer'], ['one day', 'one spring', 'that summer']],
      ['an indication she threw something', ['flung', 'fling', 'threw', 'tossed', 'hurled'], ['kicked it', 'dropped it', 'caught it']],
      ['"horseshoe" required', ['horseshoe'], ['a ring', 'a ball', 'a rock']],
      ['an indication of height or force', ['high', 'hard', 'far', 'strongly', 'too high'], ['a little', 'gently']],
      ['"inside" required', ['inside'], ['over', 'near', 'onto']],
      ['an indication the pen belonged to a vet', ['vet', 'veterinarian', 'animal doctor'], ["the neighbor's", "the farmer's", "a friend's"]],
      ['"pen" or a word for an enclosure', ['pen', 'enclosure', 'corral', 'fenced area', 'yard'], ['the barn', 'the house', 'the field']],
      ['"five" required', ['five'], ['four goats', 'six goats', 'some goats']],
      ['an indication that goats were there', ['goat', 'kid goat', 'billy goat'], ['sheep', 'cows', 'pigs']],
      ['an indication of a person responsible for the goats', ['keeper', 'owner', 'caretaker', 'took care', 'looked after'], ['a bystander', 'the police', 'a visitor']],
      ['an indication the goats were making noise', ['bleats', 'bleat', 'bleating', 'baaing', 'noise', 'crying', 'heard goats'], ['saw the goats', 'the goats ran off']],
      ['an indication the keeper came', ['rushed in', 'rushed', 'ran in', 'came in', 'came out', 'hurried', 'showed up'], ['stayed inside', 'called the police']],
      ['an indication help was given', ['helped', 'help', 'helping', 'assisted', 'aided'], ['watched her', 'laughed at her']],
      ['an indication she got the horseshoe back', ['grab', 'grabbed', 'got horseshoe back', 'get horseshoe back', 'got horseshoe', 'returned horseshoe', 'gave her horseshoe', 'picked up horseshoe'], ['lost the horseshoe', 'left the horseshoe']],
    ],
  ),
];

// ---- Validator (CI) ---------------------------------------------------------------

/** Rough syllable count (vowel groups), the same heuristic used for the reference numbers. */
export function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  const groups = w.match(/[aeiouy]+/g)?.length ?? 0;
  const silentE = w.endsWith('e') && !w.endsWith('le') && groups > 1 ? 1 : 0;
  return Math.max(1, groups - silentE);
}
const storyWords = (f: Form): string[] => (f.items.story?.[0] ?? '').match(/[A-Za-z0-9:']+/g) ?? [];

const counts: EquivalenceConstraint = (f) => {
  const issues: string[] = [];
  if ((f.items.bits ?? []).length !== 44) issues.push(`needs 44 verbatim bits, has ${(f.items.bits ?? []).length}`);
  if ((f.items.bitWords ?? []).length !== 44) issues.push('needs a scored word per bit');
  const units = storyUnits(f);
  if (units.length !== 25) issues.push(`needs 25 paraphrase units, has ${units.length}`);
  if (units.filter((u) => u.required).length !== REQUIRED_UNITS.length) issues.push('wrong number of required-word units');
  return issues;
};

const lexicalMatch: EquivalenceConstraint = (f) => {
  const words = storyWords(f);
  const syl = words.reduce((n, w) => n + syllables(w.replace(/'s$/, '')), 0);
  const issues: string[] = [];
  if (Math.abs(words.length - REFERENCE.words) > 3) issues.push(`word count ${words.length} is outside ${REFERENCE.words} ± 3`);
  if (Math.abs(syl - REFERENCE.syllables) / REFERENCE.syllables > 0.05) issues.push(`syllables ${syl} are outside ${REFERENCE.syllables} ± 5%`);
  return issues;
};

/** Every unit credits the story's own word(s) (a verbatim recall also earns the paraphrase point), and names have ≥2 variants. */
const rubricComplete: EquivalenceConstraint = (f) => {
  const bitWords = f.items.bitWords ?? [];
  const singular = (w: string) => (/(s|x|z|ch|sh)es$/.test(w) ? w.slice(0, -2) : w.replace(/s$/, ''));
  return storyUnits(f).flatMap((u, k) => {
    const issues: string[] = [];
    const own = u.bits.map((b) => bitWords[b - 1] ?? '');
    const acceptWords = u.accept.flatMap((a) => a.split(' ')).map(singular);
    if (!own.some((w) => acceptWords.includes(singular(w)))) issues.push(`unit ${k + 1} doesn't credit the story's own word (${own.join(' ')})`);
    if ((k === 0 || k === 2) && u.accept.length < 3) issues.push(`unit ${k + 1} (a name) needs at least 2 variants`);
    if (u.reject.length === 0 && k !== 11) issues.push(`unit ${k + 1} has no 0-point examples`);
    return issues;
  });
};

const distinctStories: EquivalenceConstraint = (f, bank) =>
  bank.filter((o) => o.formId !== f.formId && o.items.bitWords?.[2] === f.items.bitWords?.[2]).map((o) => `same child's name as ${o.formId}`);

export const storyBank: FormBank = {
  testId: 'story-immediate',
  forms: storyForms,
  constraints: [counts, lexicalMatch, rubricComplete, distinctStories],
  minOriginalForms: 4,
};
