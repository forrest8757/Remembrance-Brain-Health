// CI entry point: fails (exit 1) if any registered form bank has an issue.
import { ALL_BANKS, validateBank } from '../src/index';

let failed = false;
for (const bank of ALL_BANKS) {
  const issues = validateBank(bank);
  if (issues.length === 0) {
    console.log(`✓ ${bank.testId}: ${bank.forms.length} forms valid`);
    continue;
  }
  failed = true;
  console.error(`✗ ${bank.testId}`);
  for (const issue of issues) console.error(`  ${issue.formId}: ${issue.message}`);
}
process.exit(failed ? 1 : 0);
