// Plain-language content for each area (redesign Phase 3, domain detail).
// Wellness framing only: what the area is, everyday things that support it,
// and which Remembrance activities measure it. No diagnostic claims.
import type { DomainKey } from '@workspace/ui';

export interface DomainContent {
  means: string;
  example: string;
  helps: string[];
  /** Activities (registry ids) that measure this area. */
  measuredBy: { id: string; title: string; available: boolean }[];
}

export const DOMAIN_CONTENT: Record<DomainKey, DomainContent> = {
  memory: {
    means: 'How well you take in new information, hold onto it, and bring it back later.',
    example: 'Like remembering a short story, or what someone told you this morning.',
    helps: ['A good night’s sleep, especially before your session', 'Regular walks or other movement you enjoy', 'Conversations and time with people', 'Learning something new, a little at a time'],
    measuredBy: [
      { id: 'story-immediate', title: 'A Short Story', available: true },
      { id: 'story-delayed', title: 'The Story Again', available: true },
    ],
  },
  attention: {
    means: 'Staying focused and keeping track of what you’re doing.',
    example: 'Like holding a phone number in mind long enough to dial it.',
    helps: ['Doing one thing at a time', 'Short breaks between tasks', 'A quiet space for things that need focus', 'Rest when you feel tired'],
    measuredBy: [
      { id: 'number-span', title: 'Number Span', available: true },
      { id: 'oral-trails', title: 'Counting Quickly', available: true },
    ],
  },
  executive: {
    means: 'Planning, switching between tasks, and following a rule while you think.',
    example: 'Like keeping a recipe on track while answering the phone.',
    helps: ['Writing short lists and breaking big jobs into steps', 'Games and puzzles you enjoy', 'Regular sleep and meals', 'Keeping stress in check, with whatever calms you'],
    measuredBy: [
      { id: 'oral-trails', title: 'Counting Quickly', available: true },
      { id: 'phonemic-fluency', title: 'Words by Letter', available: true },
      { id: 'number-span', title: 'Number Span', available: true },
    ],
  },
  language: {
    means: 'Finding the words you want and putting them together.',
    example: 'Like naming the things on a shopping list, or telling a story.',
    helps: ['Reading things you enjoy', 'Talking with friends and family', 'Word games and crosswords', 'Telling stories and sharing memories'],
    measuredBy: [
      { id: 'category-fluency', title: 'Naming Things', available: true },
      { id: 'phonemic-fluency', title: 'Words by Letter', available: true },
    ],
  },
  orientation: {
    means: 'Knowing the date, the day, and where you are.',
    example: 'Like knowing today is Tuesday and you’re at home.',
    helps: ['A calendar or clock you can see', 'A daily routine', 'Getting outside in daylight', 'Staying in touch with what’s happening around you'],
    measuredBy: [{ id: 'moca-blind', title: 'Memory and Thinking Check', available: false }],
  },
};
