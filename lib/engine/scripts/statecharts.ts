// Renders each spec's compiled XState machine as an SVG statechart
// (CLAUDE.md §14.2): one box per step, coloured by zone, listing its
// substates, with the pause/resume and completion paths.
//
//   pnpm --filter @workspace/engine statecharts
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_SPECS, type Step, type TestSpec } from '@workspace/test-spec';
import { createAdministrationMachine } from '../src/machine';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../docs/statecharts');

const COLORS = {
  protocol: { fill: '#E8EEF6', stroke: '#1E3A5F', label: 'protocol zone' },
  chrome: { fill: '#E6F9FB', stroke: '#129FAD', label: 'chrome zone' },
};
const INK = '#1E3A5F';
const SOFT = '#34495E';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function describe(step: Step): string {
  switch (step.type) {
    case 'say':
      return `say "${step.line}"`;
    case 'present':
      return `present ${step.stimulus}${step.index !== undefined ? `[${step.index}]` : ''} @ ${step.rateMs} ms${step.emphasizeFrom ? ' · misheard words emphasized' : ''}`;
    case 'respond':
      return `respond ≤ ${step.maxMs / 1000} s${step.judge ? ` · judged live` : ''}${step.followUp ? ' · one follow-up' : ''}${step.countClose ? ` · stops after ${step.countClose.atLeast}` : ''}${step.timeoutLine ? ' · "Stop." at limit' : ''}`;
    case 'practice': {
      const attempts = step.attempts ?? (step.retryLine ? 2 : 1);
      const fb = step.feedback ? 'feedback by code' : 'feedback if wrong';
      const gate = step.failGate ? ` · fail → skip to ${step.failGate.skipTo ?? 'end'} (${step.failGate.reasonCode})` : '';
      return `practice ${step.item} · ${attempts} attempt${attempts === 1 ? '' : 's'} · ${fb}${gate}`;
    }
    case 'sequenceTask':
      return `live sequence "${step.sequence}" ≤ ${step.maxMs / 1000} s · errors corrected (grace ${step.graceMs} ms) · ${step.stallMs / 1000} s → keep going · ${step.discontinueMs / 1000} s → discontinue (${step.discontinueReasonCode})`;
    case 'trials': {
      const rules = [`${step.groupSize}/group`, `${step.rateMs} ms/token`];
      if (step.discontinue) rules.push('discontinue: all failed in group');
      if (step.reminder) rules.push(`reminder ×${step.reminder.maxUses} before item ${step.reminder.beforeItemIndex + 1}`);
      return `trials over "${step.items}" · ${rules.join(' · ')}`;
    }
    case 'tapTask':
      return `tap check, then "${step.stimulus}" @ ${step.rateMs} ms · taps timestamped · undetectable → reason ${step.undetectableReasonCode}`;
    case 'cuedRecall':
      return `missed words only: category cue → multiple choice (after "${step.freeRecallStep}")`;
    case 'break':
      return `break card → CONTINUE`;
  }
}

function render(spec: TestSpec): string {
  const machine = createAdministrationMachine(spec);
  const running = machine.root.states.running!;
  const W = 820;
  const boxW = 520;
  const x = 40;
  let y = 96;
  const parts: string[] = [];
  const centers: number[] = [];

  spec.steps.forEach((step, i) => {
    const node = running.states[`step${i}`]!;
    const zone = node.tags.includes('protocol') ? 'protocol' : 'chrome';
    const subs = Object.keys(node.states);
    // Lay substates out as chips, wrapping onto extra rows.
    const chips: { sub: string; cx: number; row: number; w: number }[] = [];
    let cx = x + 16;
    let row = 0;
    for (const sub of subs) {
      const w = sub.length * 7.2 + 18;
      if (cx + w > x + boxW - 16) {
        row++;
        cx = x + 16;
      }
      chips.push({ sub, cx, row, w });
      cx += w + 6;
    }
    const rows = subs.length ? row + 1 : 0;
    const h = 60 + rows * 26;
    const c = COLORS[zone];
    parts.push(
      `<rect x="${x}" y="${y}" width="${boxW}" height="${h}" rx="12" fill="${c.fill}" stroke="${c.stroke}" stroke-width="2"/>`,
      `<text x="${x + 16}" y="${y + 24}" font-size="15" font-weight="700" fill="${INK}">${i + 1}. ${esc(step.key)}</text>`,
      `<text x="${x + boxW - 16}" y="${y + 24}" font-size="12" text-anchor="end" fill="${SOFT}">${step.type} · ${zone}</text>`,
      `<text x="${x + 16}" y="${y + 44}" font-size="12" fill="${SOFT}">${esc(describe(step))}</text>`,
    );
    for (const chip of chips) {
      const cy = y + 54 + chip.row * 26;
      parts.push(
        `<rect x="${chip.cx}" y="${cy}" width="${chip.w}" height="20" rx="10" fill="#FFFFFF" stroke="${c.stroke}"/>`,
        `<text x="${chip.cx + chip.w / 2}" y="${cy + 14}" font-size="11" text-anchor="middle" fill="${INK}">${esc(chip.sub)}</text>`,
      );
    }
    centers.push(y + h / 2);
    if (i < spec.steps.length - 1) {
      parts.push(`<line x1="${x + boxW / 2}" y1="${y + h}" x2="${x + boxW / 2}" y2="${y + h + 22}" stroke="${INK}" stroke-width="2" marker-end="url(#arrow)"/>`);
    }
    y += h + 24;
  });

  // Completion.
  parts.push(
    `<line x1="${x + boxW / 2}" y1="${y - 24}" x2="${x + boxW / 2}" y2="${y - 2}" stroke="${INK}" stroke-width="2" marker-end="url(#arrow)"/>`,
    `<rect x="${x + boxW / 2 - 70}" y="${y}" width="140" height="36" rx="18" fill="${INK}"/>`,
    `<text x="${x + boxW / 2}" y="${y + 23}" font-size="13" font-weight="700" text-anchor="middle" fill="#FFFFFF">complete (final)</text>`,
  );

  // Pause / resume rail on the right.
  const railX = x + boxW + 36;
  const top = centers[0]!;
  const bottom = centers[centers.length - 1]!;
  parts.push(
    `<line x1="${railX}" y1="${top}" x2="${railX}" y2="${bottom}" stroke="${SOFT}" stroke-width="2" stroke-dasharray="4 4"/>`,
    ...centers.map((cy) => `<line x1="${x + boxW}" y1="${cy}" x2="${railX}" y2="${cy}" stroke="${SOFT}" stroke-width="1" stroke-dasharray="4 4"/>`),
    `<rect x="${railX + 12}" y="${(top + bottom) / 2 - 48}" width="180" height="96" rx="12" fill="#FFFFFF" stroke="${SOFT}" stroke-width="2"/>`,
    `<text x="${railX + 102}" y="${(top + bottom) / 2 - 22}" font-size="13" font-weight="700" text-anchor="middle" fill="${INK}">paused</text>`,
    `<text x="${railX + 102}" y="${(top + bottom) / 2 - 2}" font-size="11" text-anchor="middle" fill="${SOFT}">PAUSE from any step</text>`,
    `<text x="${railX + 102}" y="${(top + bottom) / 2 + 16}" font-size="11" text-anchor="middle" fill="${SOFT}">RESUME → ${spec.onInterrupt === 'invalidate' ? 'complete (97)' : 'same step'}</text>`,
    `<text x="${railX + 102}" y="${(top + bottom) / 2 + 34}" font-size="11" text-anchor="middle" fill="${SOFT}">ABORT → complete</text>`,
  );

  const height = y + 60;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}" font-family="Inter, system-ui, sans-serif">`,
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${INK}"/></marker></defs>`,
    `<rect width="100%" height="100%" fill="#F5F1EA"/>`,
    `<text x="${x}" y="40" font-size="20" font-weight="700" fill="${INK}">${esc(spec.title)}</text>`,
    `<text x="${x}" y="64" font-size="12" fill="${SOFT}">${esc(spec.testId)} · spec ${spec.specVersion} · generated from the compiled XState machine</text>`,
    `<rect x="${W - 250}" y="28" width="14" height="14" rx="3" fill="${COLORS.protocol.fill}" stroke="${COLORS.protocol.stroke}"/><text x="${W - 230}" y="40" font-size="12" fill="${SOFT}">protocol zone</text>`,
    `<rect x="${W - 130}" y="28" width="14" height="14" rx="3" fill="${COLORS.chrome.fill}" stroke="${COLORS.chrome.stroke}"/><text x="${W - 110}" y="40" font-size="12" fill="${SOFT}">chrome zone</text>`,
    ...parts,
    `</svg>`,
  ].join('\n');
}

mkdirSync(OUT, { recursive: true });
for (const spec of ALL_SPECS) {
  const file = path.join(OUT, `${spec.testId}.svg`);
  writeFileSync(file, `${render(spec)}\n`);
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}
