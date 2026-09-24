export type BrainDomain = {
  id: string;
  title: string;
  region: string;
  summary: string;
  explanation: string;
  everyday: string;
  tryIt: string;
  context: string;
  view: {
    rotation: [number, number, number];
    /** Approximate surface focus, in centered model coordinates (max dimension 2). */
    target: [number, number, number];
    distance: number;
  };
};

/** Educational viewpoints, not segmented anatomy or locations of personal scores. */
export const BRAIN_DOMAINS: BrainDomain[] = [
  {
    id: 'attention',
    title: 'Attention',
    region: 'Parietal cortex',
    summary: 'Choosing what to focus on—and what to ignore.',
    explanation: 'Parietal regions help direct attention toward relevant sights and sensations. They work with frontal regions and other networks to keep a goal in mind and shift focus when something changes.',
    everyday: 'Following one conversation in a busy room, or finding an item on a crowded shelf.',
    tryIt: 'For a moment, notice one sound around you. Then deliberately shift your attention to a different sound.',
    context: 'This is one part of a distributed attention network, not a single attention center.',
    view: { rotation: [0.3, -1.15, 0], target: [0.48, 0.45, -0.18], distance: 2.65 },
  },
  {
    id: 'executive',
    title: 'Executive function',
    region: 'Prefrontal cortex',
    summary: 'Making a plan and adjusting it along the way.',
    explanation: 'The prefrontal cortex helps hold goals in mind, weigh choices, and manage impulses. Together with other brain regions, it helps you switch approaches when a plan is not working.',
    everyday: 'Organizing the steps of a meal while keeping track of what needs to happen next.',
    tryIt: 'Choose a small task for today. Name the first step, then one thing that might make you change your plan.',
    context: 'Executive skills depend on connected networks, not only the front of the brain.',
    view: { rotation: [0.05, -0.55, 0], target: [0.25, 0.36, 0.7], distance: 2.6 },
  },
  {
    id: 'memory',
    title: 'Memory',
    region: 'Temporal lobe',
    summary: 'Learning something new and finding it again later.',
    explanation: 'The hippocampus, deep within the temporal lobe, helps form new memories of events and experiences. Remembering also involves widespread cortical networks; memories are not kept in just one place.',
    everyday: 'Recalling where you parked, or remembering a conversation with a friend.',
    tryIt: 'Think of one moment from yesterday. What was happening, and what detail helps you remember it?',
    context: 'The view shows the outer temporal lobe. The hippocampus lies inside and is not visible in this surface-only model.',
    view: { rotation: [-0.12, -1.5, 0], target: [0.51, -0.13, 0.08], distance: 2.6 },
  },
  {
    id: 'language',
    title: 'Language',
    region: 'Frontal–temporal network',
    summary: 'Turning ideas into words and making sense of what you hear.',
    explanation: 'Frontal and temporal regions work together to help produce speech and understand words and meaning. Language often relies more on the left hemisphere, but the pattern varies and involves both sides.',
    everyday: 'Finding the right word in a conversation, or understanding a written message.',
    tryIt: 'Pick a familiar object. Describe what it does without saying its name.',
    context: 'This lateral view is a representative focus on the language network, not a precise boundary or a map of an individual’s language abilities.',
    view: { rotation: [0.04, -1.2, 0], target: [0.5, 0.08, 0.35], distance: 2.7 },
  },
  {
    id: 'motor',
    title: 'Perpetual Motor',
    region: 'Cerebellum',
    summary: 'Helping movement stay smooth, timed, and accurate.',
    explanation: 'The cerebellum helps fine-tune movement and balance by comparing intended movement with sensory feedback. It works with motor and sensory areas; visual–spatial skills also involve other networks.',
    everyday: 'Reaching for a cup, adjusting your steps, or coordinating your hands while you cook.',
    tryIt: 'While comfortably seated, slowly touch your thumb to each fingertip. Notice the timing rather than trying to go fast.',
    context: 'The cerebellum is one contributor to coordination, not the whole perceptual–motor domain.',
    view: { rotation: [-0.25, -2.2, 0], target: [0.24, -0.48, -0.59], distance: 2.6 },
  },
];

export const OVERVIEW_VIEW: BrainDomain['view'] = {
  rotation: [0.1, -0.65, 0],
  target: [0, 0, 0],
  distance: 4.4,
};

export function getBrainDomain(index: number | null | undefined) {
  return typeof index === 'number' ? BRAIN_DOMAINS[index] : undefined;
}