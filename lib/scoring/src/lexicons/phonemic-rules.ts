// Hand-written tables for T7 phonemic fluency (build doc §T7 "Scoring").
// Letters covered: the forms' letters F, L, S, W, A, H.

const set = (s: string) => new Set(s.trim().split(/\s*\|\s*|\s{2,}|\n/).map((w) => w.trim()).filter(Boolean));
const words = (s: string) => new Set(s.trim().split(/\s+/));

/** Names of places (violations unless also an ordinary word: then benefit of the doubt). */
export const PLACES = set(`
africa | america | asia | australia | austria | argentina | alabama | alaska | arizona | arkansas | atlanta | austin | albany |
albuquerque | anchorage | amsterdam | athens | algeria | afghanistan | albania | angola | armenia | antarctica | arctic | atlantic |
amazon | alps | appalachia | anaheim | akron | alexandria | annapolis | aspen | acapulco | adelaide | auckland | ankara | accra |
abu dhabi | antigua | aruba | azerbaijan | andorra | arlington | augusta | asheville |
france | florida | finland | fiji | fresno | frankfurt | florence | flagstaff | fargo | fort worth | fort lauderdale | fairbanks |
fayetteville | flint | fremont | fullerton | falklands | fuji | fort myers | fort wayne |
hawaii | houston | hollywood | holland | hungary | haiti | honduras | hong kong | havana | helsinki | hamburg | harlem | harrisburg |
hartford | honolulu | hanoi | himalayas | hudson | huron | hoboken | hamilton | halifax | heidelberg | hiroshima | hampton | henderson | hershey |
london | los angeles | las vegas | louisiana | lebanon | libya | liberia | lithuania | latvia | luxembourg | laos | lisbon | lima |
lagos | leeds | liverpool | lincoln | lansing | lexington | louisville | laredo | long beach | long island | lubbock | lyon |
lucerne | lapland | lesotho | lake tahoe | little rock | lake erie | laguna beach | lancaster |
spain | sweden | switzerland | scotland | singapore | sudan | syria | somalia | serbia | slovakia | slovenia | senegal | samoa |
south africa | south america | south carolina | south dakota | saudi arabia | sri lanka | seattle | san francisco | san diego |
san antonio | san jose | sacramento | salt lake city | saint louis | st louis | savannah | scottsdale | spokane | santa fe |
santa barbara | santa monica | seoul | shanghai | sydney | stockholm | sicily | siberia | sahara | sardinia | sao paulo | salem |
springfield | syracuse | stamford | st paul | saint paul | sedona | sarasota | st petersburg |
washington | wisconsin | west virginia | wyoming | wales | warsaw | wellington | winnipeg | wichita | wilmington | worcester |
waco | waikiki | wimbledon | westminster | walla walla |
boston | baltimore | brazil | belgium | berlin | bangkok | beijing | bolivia | bahamas | barcelona | birmingham | bermuda | bali |
britain | brooklyn | bronx | buffalo | boise | bismarck | baton rouge | beverly hills | belfast | budapest | brussels | bulgaria
`);

/**
 * Names and places that are also everyday words: benefit of the doubt (build
 * doc: "frank" = name / food / adjective → correct on first instance).
 */
export const AMBIGUOUS_PROPER = words(`
amber angel art ash aspen autumn amazon ace abbey
bill bob buck buddy bud brook buffalo bishop baker banks bell berry bliss blaze
frank faith fern flint fawn fleet ford forest fox field
holly hazel heather hope hunter hill hall harmony honey hawk
lily lance lane lark lincoln laurel lucky liberty lake lamb
sandy sunny sage sky summer sterling star stone sue savannah spring sparrow
will wade woody wolf west wood warren winter willow wren
`);

/** Proper nouns that are NOT people or places: allowed (build doc §T7). */
export const ALLOWED_PROPER = words('friday february saturday sunday wednesday april august thursday tuesday monday march');

/** Brand names: proper nouns that aren't people or places, so allowed (build doc §T7). */
export const BRANDS = words(`
fanta febreze fritos frito fedex ferrari fiat folgers ford frigidaire fisher facebook firestone
lego levis lexus lysol lipton listerine lamborghini lowes lucky
starbucks subway sprite sony samsung safeway sears snickers spam skittles subaru schwinn
walmart wendys walgreens wrigley whirlpool wheaties
audi adidas amazon apple arbys
honda hyundai heinz hershey hallmark huggies
budweiser buick bmw boeing burberry
`);

/** Cardinal numbers (violations). */
export const NUMBERS = words(`
zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen
nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion trillion
`);

/** Numbers that sound like ordinary words ("fôr": for/fore/four): numbers only beside other numbers. */
export const NUMBER_HOMOPHONES: Record<string, string[]> = { four: ['for', 'fore'], eight: ['ate'], one: ['won'], two: ['to', 'too'] };

/**
 * Homophone groups. Phonemic fluency is judged by spelling, but ASR hears
 * sound: if any spelling in the group starts with the target letter, benefit
 * of the doubt (flagged). Within the letter, a homophone counts as a repetition.
 */
export const HOMOPHONES: string[][] = [
  ['phase', 'faze'], ['phrase', 'frays'], ['phlox', 'flocks'], ['philter', 'filter'], ['pharaoh', 'faro'], ['phew', 'few'],
  ['flu', 'flue', 'flew'], ['for', 'fore', 'four'], ['fair', 'fare'], ['feat', 'feet'], ['find', 'fined'], ['flour', 'flower'],
  ['flea', 'flee'], ['fir', 'fur'], ['faint', 'feint'], ['fowl', 'foul'], ['frees', 'freeze', 'frieze'], ['fourth', 'forth'],
  ['lacks', 'lax'], ['laps', 'lapse'], ['leak', 'leek'], ['lead', 'led'], ['lie', 'lye'], ['loan', 'lone'], ['loot', 'lute'],
  ['lyre', 'liar'], ['llama', 'lama'], ['links', 'lynx'], ['lessen', 'lesson'], ['lochs', 'locks', 'lox'], ['leased', 'least'],
  ['cent', 'scent', 'sent'], ['cite', 'sight', 'site'], ['cell', 'sell'], ['cede', 'seed'], ['cereal', 'serial'], ['cymbal', 'symbol'],
  ['scene', 'seen'], ['ceiling', 'sealing'], ['cellar', 'seller'], ['census', 'senses'], ['sync', 'sink'], ['sale', 'sail'],
  ['sea', 'see'], ['so', 'sew', 'sow'], ['some', 'sum'], ['son', 'sun'], ['stair', 'stare'], ['steal', 'steel'], ['sweet', 'suite'],
  ['right', 'write', 'rite', 'wright'], ['ring', 'wring'], ['rap', 'wrap'], ['rest', 'wrest'], ['rote', 'wrote'], ['hole', 'whole'],
  ['one', 'won'], ['way', 'weigh', 'whey'], ['wait', 'weight'], ['weak', 'week'], ['wear', 'where', 'ware'], ['which', 'witch'],
  ['whine', 'wine'], ['wood', 'would'], ['wail', 'whale', 'wale'], ['waste', 'waist'], ['ways', 'weighs'], ['wade', 'weighed'],
  ['eight', 'ate'], ['air', 'heir', 'err'], ['aisle', 'isle'], ['allowed', 'aloud'], ['altar', 'alter'], ['ant', 'aunt'], ['ail', 'ale'],
  ['our', 'hour'], ['hair', 'hare'], ['hall', 'haul'], ['heal', 'heel', 'he’ll'], ['hear', 'here'], ['heard', 'herd'],
  ['higher', 'hire'], ['him', 'hymn'], ['hoarse', 'horse'], ['hole', 'whole'], ['holy', 'wholly'], ['hostel', 'hostile'], ['hay', 'hey'],
];

/** Irregular inflections → base (tense/plural/comparative only). */
export const IRREGULAR: Record<string, string> = {
  flew: 'fly', flown: 'fly', flies: 'fly', felt: 'feel', fell: 'fall', fallen: 'fall', fought: 'fight', found: 'find', forgot: 'forget',
  forgotten: 'forget', froze: 'freeze', frozen: 'freeze', fled: 'flee', fed: 'feed', forbade: 'forbid', forbidden: 'forbid', forgave: 'forgive',
  forgiven: 'forgive', foresaw: 'foresee', fewer: 'few', fewest: 'few', farther: 'far', farthest: 'far', further: 'far', furthest: 'far',
  feet: 'foot', led: 'lead', left: 'leave', lost: 'lose', laid: 'lay', lain: 'lie', lit: 'light', lent: 'lend', less: 'little', least: 'little',
  leapt: 'leap', learnt: 'learn', lice: 'louse', loaves: 'loaf', lives: 'life', leaves: 'leaf',
  sang: 'sing', sung: 'sing', sat: 'sit', saw: 'see', seen: 'see', sold: 'sell', sent: 'send', slept: 'sleep', slid: 'slide', spoke: 'speak',
  spoken: 'speak', stood: 'stand', stole: 'steal', stolen: 'steal', swam: 'swim', swum: 'swim', swore: 'swear', sworn: 'swear', struck: 'strike',
  shook: 'shake', shaken: 'shake', shot: 'shoot', shown: 'show', sought: 'seek', said: 'say', sank: 'sink', sunk: 'sink', sprang: 'spring',
  sprung: 'spring', spun: 'spin', stuck: 'stick', stung: 'sting', strove: 'strive', swept: 'sweep', swung: 'swing', shone: 'shine',
  shrank: 'shrink', sewn: 'sew', sheep: 'sheep', spent: 'spend', spat: 'spit', slung: 'sling', smelt: 'smell', sped: 'speed',
  wore: 'wear', worn: 'wear', won: 'win', wrote: 'write', written: 'write', woke: 'wake', woken: 'wake', went: 'go', wept: 'weep',
  wound: 'wind', withdrew: 'withdraw', withheld: 'withhold', women: 'woman', wives: 'wife', wolves: 'wolf', worse: 'bad', worst: 'bad',
  ate: 'eat', eaten: 'eat', arose: 'arise', arisen: 'arise', awoke: 'awake', awoken: 'awake', ab: 'ab',
  held: 'hold', heard: 'hear', hid: 'hide', hidden: 'hide', hung: 'hang', had: 'have', has: 'have', halves: 'half', hooves: 'hoof',
};

/** Adjectives whose -er/-est forms are comparatives (agentive -er like "farmer" is not). */
export const ADJECTIVES = words(`
fast fat few fine firm flat fair fit fresh full funny fancy free fond foul frank faint fierce filthy friendly fussy fuzzy foggy
large late light long loud low lucky lovely lazy lean lame lush lively lonely loose
safe sad sharp short shy silly simple slim slow small smart smooth soft soon sour steep stiff still strange strong sweet sick
smelly sunny shiny salty spicy sleepy sloppy stingy sturdy sly
warm weak wet white wide wild wise windy weird wealthy witty wordy wavy
able angry awful
big bad black blue bold brave bright broad brief busy
happy hard harsh heavy high hot huge humble hungry healthy handy hairy hasty hazy holy
`);

/** Words that look like an inflection of another word but aren't (feed ≠ fee+d, news ≠ new+s). */
export const FALSE_FRIENDS = words(`
feed need seed shed sled speed wed weed heed hundred hatred sacred wicked wretched aged news lens awning wedding herring
ceiling seeing shining landing lining heading filling fencing swing sting string spring sling fling wing sing hassle
`);

/**
 * Words with several meanings: a repeat is a repetition unless the context
 * strongly suggests another meaning ("felt, feeling, fresh, fabric, felt").
 * Each entry lists neighbor words that cue each meaning.
 */
export const SENSES: Record<string, string[][]> = {
  felt: [['feel', 'feeling', 'feelings', 'touch', 'emotion', 'fear', 'found'], ['fabric', 'fleece', 'flannel', 'wool', 'material', 'fur', 'cloth', 'linen', 'leather', 'silk', 'felt']],
  fly: [['insect', 'flea', 'fruit', 'firefly', 'flies', 'fleas', 'fruitfly', 'gnat'], ['flight', 'flew', 'flying', 'float', 'flap', 'fall']],
  fan: [['fanatic', 'follower', 'football', 'fame'], ['fanning', 'freezer', 'fridge', 'furnace', 'fresh air']],
  fair: [['fairground', 'festival', 'ferris', 'fun'], ['fairness', 'faithful', 'frank', 'fine']],
  file: [['folder', 'form', 'fax', 'filing'], ['filing', 'fingernail', 'finger']],
  light: [['lamp', 'lantern', 'lamp', 'luminous', 'lit'], ['little', 'lean', 'lightweight', 'loose']],
  lead: [['leader', 'leading', 'leash'], ['lithium', 'liquid', 'lime', 'lumber']],
  left: [['leave', 'leaving', 'lost'], ['leftover', 'lateral', 'lefty']],
  last: [['late', 'later', 'latest'], ['lasting', 'long', 'linger']],
  saw: [['see', 'seen', 'sight'], ['sawdust', 'screw', 'sander', 'shovel', 'sledge']],
  seal: [['sea', 'sea lion', 'shark', 'swim'], ['sealed', 'stamp', 'sticker', 'signature']],
  well: [['wellness', 'wealthy', 'wonderful'], ['water', 'wishing', 'wet', 'wade']],
  watch: [['watched', 'witness', 'wait'], ['wristwatch', 'wrist', 'wallet', 'wedding ring']],
  wave: [['water', 'waves', 'wet', 'wade'], ['waving', 'wink', 'welcome']],
  hand: [['handy', 'hammer', 'help'], ['hands', 'hair', 'head', 'heel']],
  still: [['silent', 'silence', 'stillness', 'stop'], ['steam', 'spirits', 'sour mash']],
};

/** Ordinary modern words missing from the 1934 dictionary. */
export const SUPPLEMENT = words(`
fax facebook fajita falafel fedora fiberglass flashlight footage freeway fridge frisbee fries fax
laptop latte lasagna landline lipstick login laser lifestyle lifeguard lollipop
smartphone software spreadsheet skateboard snowboard selfie sushi salsa spaghetti supermarket
website weekend wifi windshield workout wristwatch
airline airport app avocado
hamburger hashtag headphones helicopter highway hotdog
`);
