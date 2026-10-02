// Firewall test (CLAUDE.md §14.8) at the DOM level: render the participant
// UI for every state of real (simulated-call) administrations and check that
// (1) no stimulus token ever reaches the markup and (2) the markup sequence is
// identical for correct, incorrect and silent responses.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { categoryFluencySpec, mocaSpec, numberSpanSpec, oralTrailsSpec, phonemicFluencySpec, storyDelayedSpec, storyImmediateSpec, toyColorsSpec } from '@workspace/test-spec';
import { categoryFluencyForms, mocaOriginalForms, numberSpanFrozenForms, oralTrailsForms, phonemicFluencyForms, storyForms, toyColorsForms } from '@workspace/forms';
import { categoryFluencyJudges, loadPhonemicDictionary, mocaJudges, numberSpanJudges, oralTrailsJudges, phonemicFluencyJudges, storyRecallJudgesFor } from '@workspace/scoring';
import { simulateCall, type Script } from '@workspace/engine/testing';
import { ProtocolScreen } from './components/ProtocolScreen';

const noop = () => {};

async function renderRun(script: Script, form = toyColorsForms[0]!): Promise<string[]> {
  const call = simulateCall(toyColorsSpec, form, [script]);
  await call.advance(30_000);
  await call.run.done;
  return call.views
    .filter((v) => v.phase !== 'complete')
    .map((view) =>
      renderToStaticMarkup(<ProtocolScreen view={view} progress={{ current: 1, total: 1 }} onDone={noop} onRepeat={noop} onPause={noop} onContinue={noop} />),
    );
}

describe('Standardization Firewall (DOM)', () => {
  const allTokens = toyColorsForms.flatMap((f) => f.items.colors!);

  it.each(toyColorsForms.map((f) => [f.formId, f] as const))('never renders a stimulus token (%s)', async (_id, form) => {
    const pages = await renderRun({ words: [['red', 1000], ['green', 1500]] }, form);
    expect(pages.length).toBeGreaterThan(4);
    for (const html of pages) {
      const text = html.replace(/<[^>]+>/g, ' ').toLowerCase();
      for (const token of allTokens) expect(text).not.toMatch(new RegExp(`\\b${token}\\b`));
    }
  });

  it('renders identical markup for correct, incorrect and silent responses', async () => {
    const correct = await renderRun({ words: [['red', 1000], ['blue', 1800], ['yellow', 2600]] });
    const incorrect = await renderRun({ words: [['green', 1000], ['pink', 1800], ['orange', 2600]] });
    const silent = await renderRun({ words: [] });
    expect(incorrect).toEqual(correct);
    expect(silent).toEqual(correct);
  });
});

describe('Standardization Firewall (DOM): T3 Number Span', () => {
  // Form B, not Form A: licensed Form A reuses the backward example "3–7–4"
  // as a test item, so its instruction caption necessarily shows it (T3 README).
  const form = numberSpanFrozenForms[0]!;
  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

  async function pages(answerItem0: 'correct' | 'incorrect' | 'silent') {
    const script = (windowKey: string): Script => {
      const base = windowKey.split('#')[0]!;
      const [block, idx] = base.split('.');
      const item = base === 'fwdPractice' ? '3-9-5' : base === 'bwdPractice' ? '7-1-5' : form.items[block!]![Number(idx)]!;
      let digits = item.split('-').map(Number);
      if (block === 'backward' || base === 'bwdPractice') digits = digits.reverse();
      if (base === 'forward.0') {
        if (answerItem0 === 'silent') return { words: [] };
        if (answerItem0 === 'incorrect') digits = [9, 9];
      }
      return { words: digits.map((d, i) => [WORDS[d]!, 600 + i * 500] as [string, number]) };
    };
    const call = simulateCall(numberSpanSpec, form, script, { judges: numberSpanJudges });
    await call.advance(400_000);
    await call.run.done;
    return call.views
      .filter((v) => v.phase !== 'complete')
      .map((view) => ({
        view,
        html: renderToStaticMarkup(<ProtocolScreen view={view} progress={{ current: 1, total: 1 }} onDone={noop} onRepeat={noop} onPause={noop} onContinue={noop} />),
      }));
  }

  it('never renders a test item, and shows no digits at all while presenting or listening', async () => {
    const items = [...form.items.forward!, ...form.items.backward!];
    for (const { view, html } of await pages('correct')) {
      // Strip tags and character references (&#x27; would otherwise read as digits).
      const text = html.replace(/<[^>]+>/g, ' ').replace(/&#x?[0-9a-f]+;/gi, ' ');
      for (const item of items) {
        expect(text).not.toContain(item);
        expect(text).not.toContain(item.replaceAll('-', '–'));
        expect(text).not.toContain(item.replaceAll('-', ' '));
      }
      // The session-level rail ("Activity 1 of 1") is the only number allowed.
      if (view.phase === "presenting" || view.phase === "listening") expect(text.replace(/Activity \d+ of \d+/g, '')).not.toMatch(/\d/);
    }
  });

  it('renders identical pages for correct, incorrect and silent answers', async () => {
    const html = async (a: 'correct' | 'incorrect' | 'silent') => (await pages(a)).map((p) => p.html);
    const correct = await html('correct');
    expect(await html('incorrect')).toEqual(correct);
    expect(await html('silent')).toEqual(correct);
  });
});

describe('Standardization Firewall (DOM): T1 MoCA-Blind', () => {
  const form = mocaOriginalForms[0]!;

  it('never renders memory words, cues, choices, sentences, digits or letters on any screen', async () => {
    const call = simulateCall(
      mocaSpec,
      form,
      (windowKey) => ({ words: windowKey.startsWith('delayedFree') ? [['knee', 500]] : [['something', 500]] }),
      { judges: mocaJudges, realtimePresentation: true, tapOn: (c) => c === 'tok.a' },
    );
    await call.advanceUntilDone();
    const secret = [
      ...form.items.words!,
      ...form.items.choices!.flatMap((c) => c.split('|')),
      ...form.items.cues!,
      ...form.items.sentences!,
      form.items.digitsForward![0]!,
      form.items.digitsBackward![0]!,
    ].map((s) => s.toLowerCase());
    // The cue screens must have appeared (4 words missed) for this to mean anything.
    expect(call.views.filter((v) => v.stepKey === 'delayedCues' && v.phase === 'examinerSpeaking').length).toBeGreaterThan(0);
    for (const view of call.views.filter((v) => v.phase !== 'complete')) {
      const html = renderToStaticMarkup(<ProtocolScreen view={view} onDone={noop} onRepeat={noop} onPause={noop} onContinue={noop} onTap={noop} />);
      const text = html.replace(/<[^>]+>/g, ' ').replace(/&#x?[0-9a-f]+;/gi, ' ').toLowerCase();
      for (const s of secret) expect(text, `${view.phase}/${view.stepKey}: ${s}`).not.toMatch(new RegExp(`\\b${s.replace(/[.?]/g, '')}\\b`));
      if (view.phase === 'tapping' || view.phase === 'tapCheck') {
        // No letters on screen during vigilance: only the button label.
        expect(text.replace(/listen and tap|tap once|tap the big button once\.|tap|remembrance|pause/g, '').trim()).toBe('');
      }
    }
  });
});

describe('Standardization Firewall (DOM): T6 Category Fluency', () => {
  const form = categoryFluencyForms[0]!;
  const spoken = ['dog', 'cat', 'cow', 'horse', 'robin', 'carrot', 'peas', 'corn', 'blorgle'];
  const at = (text: string): Script => ({ words: text.split(' ').map((w, i) => [w, 1000 + i * 2000] as [string, number]) });

  async function pages(animals: Script) {
    const call = simulateCall(categoryFluencySpec, form, (windowKey) => {
      const base = windowKey.split('#')[0];
      return base === 'practice' ? at('socks pants') : base === 'animals' ? animals : at('carrot peas corn');
    }, { judges: categoryFluencyJudges });
    await call.advanceUntilDone();
    return call.views
      .filter((v) => v.phase !== 'complete')
      .map((view) => renderToStaticMarkup(<ProtocolScreen view={view} progress={{ current: 1, total: 1 }} onDone={noop} onRepeat={noop} onPause={noop} onContinue={noop} />));
  }

  it('never shows recognized words, and no counter or timer while listening', async () => {
    for (const html of await pages(at('dog cat cow horse robin'))) {
      const text = html.replace(/<[^>]+>/g, ' ').toLowerCase();
      for (const w of spoken) expect(text).not.toMatch(new RegExp(`\\b${w}\\b`));
      expect(text).not.toMatch(/\b\d+\s*(s|sec|seconds|words?)\b/);
    }
  });

  it('renders identical pages for many answers, wrong answers and silence', async () => {
    const many = await pages(at('dog cat cow horse robin'));
    const wrong = await pages(at('blorgle carrot'));
    const silent = await pages({ words: [] });
    expect(wrong).toEqual(many);
    expect(silent).toEqual(many);
  });
});

describe('Standardization Firewall (DOM): T8 Oral Trails', () => {
  const form = oralTrailsForms[0]!;
  const A = form.items.partA![0]!.split('-');
  const B = form.items.partB![0]!.split('-');
  const at = (units: string[], gap = 600, start = 1000): Script => ({ words: units.map((u, i) => [u, start + i * gap] as [string, number]) });

  async function pages(partA: Script) {
    const call = simulateCall(oralTrailsSpec, form, (windowKey) => {
      const base = windowKey.split('#')[0];
      if (base === 'partA') return partA;
      if (base === 'pretest') return at('abcdefghijkl'.split(''), 400);
      if (base === 'bPractice') return at(['1', 'a', '2', 'b', '3', 'c', '4'], 500);
      return at(B, 900);
    }, { judges: oralTrailsJudges });
    await call.advanceUntilDone();
    return call.views.map((view) => ({
      view,
      html: renderToStaticMarkup(<ProtocolScreen view={view} progress={{ current: 1, total: 1 }} onDone={noop} onRepeat={noop} onPause={noop} onContinue={noop} />),
    }));
  }

  it('shows no numbers or letters while the participant counts (only the orb)', async () => {
    for (const { view, html } of await pages(at(A))) {
      if (view.phase !== 'listening' || !['partA', 'partB'].includes(view.stepKey ?? '')) continue;
      // The progress rail ("Activity 1 of 1") counts tests, not items: allowed (CLAUDE.md §9).
      const text = html.replace(/<[^>]+>/g, ' ').replace(/Activity \d+ of \d+/, '');
      expect(text).not.toMatch(/\b\d+\b/);
      expect(text).not.toMatch(/\b[A-L]\b/);
    }
  });

  it('renders identical pages for a clean count, a count with errors and silence', async () => {
    const strip = (xs: { html: string }[]) => xs.map((x) => x.html);
    const clean = strip(await pages(at(A)));
    const errors = strip(await pages({ words: [...at(['1', '2', '3', '5', '6']).words, ...at(A.slice(2), 600, 7_000).words] }));
    const silent = strip(await pages({ words: [] }));
    expect(errors).toEqual(clean);
    expect(silent).toEqual(clean);
  });
});

describe('Standardization Firewall (DOM): T7 Phonemic Fluency', () => {
  const form = phonemicFluencyForms[0]!;
  const at = (text: string): Script => ({ words: text.split(' ').map((w, i) => [w, 1000 + i * 2000] as [string, number]) });

  async function pages(first: Script) {
    await loadPhonemicDictionary();
    const call = simulateCall(phonemicFluencySpec, form, (k) => (k.startsWith('first') ? first : at('lemon lion')), { judges: phonemicFluencyJudges });
    await call.advanceUntilDone();
    return call.views
      .filter((v) => v.phase !== 'complete')
      .map((view) => renderToStaticMarkup(<ProtocolScreen view={view} progress={{ current: 1, total: 1 }} onDone={noop} onRepeat={noop} onPause={noop} onContinue={noop} />));
  }

  it('never shows what the participant said; the letter cue is the only task text while listening', async () => {
    for (const html of await pages(at('fish frog fred feather'))) {
      const text = html.replace(/<[^>]+>/g, ' ').toLowerCase();
      for (const w of ['fish', 'frog', 'fred', 'feather', 'lemon', 'lion']) expect(text).not.toMatch(new RegExp(`\\b${w}\\b`));
    }
  });

  it('renders identical pages for good words, rule breaks and silence', async () => {
    const good = await pages(at('fish fox frog'));
    const bad = await pages(at('dog cat mouse fred'));
    const silent = await pages({ words: [] });
    expect(bad).toEqual(good);
    expect(silent).toEqual(good);
  });
});

describe('Standardization Firewall (DOM): T2 Story Recall', () => {
  // Words specific to each story (not common words that also appear in instructions).
  const COMMON = new Set(['every', 'he', 'she', 'their', 'them', 'her', 'it', 'so', 'one', 'out', 'in', 'over', 'heard', 'helped', 'loved', 'enjoyed', 'and', 'to', 'the']);

  async function pages(spec: typeof storyImmediateSpec, form: (typeof storyForms)[number], recall: Script) {
    const call = simulateCall(spec, form, () => recall, { judges: storyRecallJudgesFor(form) });
    await call.advanceUntilDone();
    return call.views
      .filter((v) => v.phase !== 'complete')
      .map((view) => renderToStaticMarkup(<ProtocolScreen view={view} progress={{ current: 1, total: 1 }} onDone={noop} onRepeat={noop} onPause={noop} onContinue={noop} />));
  }

  it.each(storyForms.map((f) => [f.formId, f] as const))('never shows the story (%s), immediate or delayed', async (_id, form) => {
    const secret = form.items.bitWords!.filter((w) => !COMMON.has(w));
    for (const spec of [storyImmediateSpec, storyDelayedSpec]) {
      for (const html of await pages(spec, form, { words: [['something', 1000]] })) {
        const text = html.replace(/<[^>]+>/g, ' ').toLowerCase();
        for (const w of secret) expect(text, `${spec.testId}: ${w}`).not.toMatch(new RegExp(`\\b${w}\\b`));
      }
    }
  });

  it('renders identical pages for a full retelling, a wrong story and silence', async () => {
    const form = storyForms[0]!;
    const at = (t: string): Script => ({ words: t.split(' ').map((w, i) => [w, 800 + i * 400] as [string, number]) });
    const good = await pages(storyImmediateSpec, form, at(form.items.story![0]!.replace(/[.,]/g, '')));
    const wrong = await pages(storyImmediateSpec, form, at('a girl went sailing on a boat with her grandmother'));
    const silent = await pages(storyImmediateSpec, form, { words: [] });
    expect(wrong).toEqual(good);
    expect(silent).toEqual(good);
  });
});
