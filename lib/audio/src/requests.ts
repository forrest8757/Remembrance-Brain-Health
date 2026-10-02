// Every clip an administration of (spec, form) can play: each rendering of
// every scripted line, every stimulus token, and emphasized variants. Used to
// pre-render clips and to preload them before a session.
import { enumerateRenderings, renderLine, type FormLike, type TestSpec } from '@workspace/test-spec';
import { emphasisClipId, tokenClipId, type ClipEntry } from './manifest';

export interface ClipRequest {
  clipId: string;
  kind: ClipEntry['kind'];
  /** What the voice says. */
  text: string;
}

const tokensOf = (item: string) => item.split('-').filter(Boolean);

/** How a stimulus token is spoken: letters by name ("A" not the article), everything else as written. */
export function tokenSpeech(token: string): string {
  return /^[A-Za-z]$/.test(token) ? `${token.toUpperCase()}.` : token;
}

export function clipRequests(spec: TestSpec, form: FormLike): ClipRequest[] {
  const out = new Map<string, ClipRequest>();
  const add = (r: ClipRequest) => out.set(r.clipId, r);

  for (const { lineKey, vars } of enumerateRenderings(spec, form)) {
    const line = renderLine(spec, lineKey, form, vars);
    add({ clipId: line.clipId, kind: 'line', text: line.ttsText });
  }
  const addTokens = (tokens: string[], emphasis = false) => {
    for (const t of tokens) {
      add({ clipId: tokenClipId(t), kind: 'token', text: tokenSpeech(t) });
      if (emphasis) add({ clipId: emphasisClipId(t), kind: 'emphasis', text: tokenSpeech(t) });
    }
  };
  for (const step of spec.steps) {
    if (step.type === 'present') {
      const list = form.items[step.stimulus] ?? [];
      addTokens(step.index !== undefined ? tokensOf(list[step.index] ?? '') : list, !!step.emphasizeFrom);
    } else if (step.type === 'trials') {
      addTokens((form.items[step.items] ?? []).flatMap(tokensOf));
    } else if (step.type === 'tapTask') {
      addTokens(tokensOf(form.items[step.stimulus]?.[step.index] ?? ''));
    }
  }
  return [...out.values()];
}
