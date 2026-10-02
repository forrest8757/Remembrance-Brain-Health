// Battery presets (build doc P2): the two canonical NACC orders and the lean
// B2C battery (build doc §2c). Decision D2 (RAVLT vs CERAD) picks Table 1 or 2.
// Table 1's "non-interfering questionnaires" (to meet the RAVLT delay) are
// supplied by the delay manager's non-verbal filler rather than a fixed item.

export interface BatteryItem {
  testId: string;
  optional?: boolean;
}

export interface BatteryDef {
  id: string;
  title: string;
  items: BatteryItem[];
  /**
   * Visits (D12): item indexes grouped per sitting. Default: one sitting.
   * e.g. [[0], [1, 2, …]] runs MoCA 1–7 days before the rest.
   */
  visits?: number[][];
}

export const TABLE_1_RAVLT: BatteryDef = {
  id: 'nacc-table-1',
  title: 'NACC order (RAVLT)',
  items: [
    { testId: 'moca-blind' },
    { testId: 'story-immediate' },
    { testId: 'number-span' },
    { testId: 'ravlt-immediate' },
    { testId: 'category-fluency' },
    { testId: 'oral-trails', optional: true },
    { testId: 'story-delayed' },
    { testId: 'phonemic-fluency' },
    { testId: 'ravlt-delayed' },
    { testId: 'naming', optional: true },
  ],
};

export const TABLE_2_CERAD: BatteryDef = {
  id: 'nacc-table-2',
  title: 'NACC order (CERAD)',
  items: [
    { testId: 'moca-blind' },
    { testId: 'story-immediate' },
    { testId: 'number-span' },
    { testId: 'cerad-immediate' },
    { testId: 'category-fluency' },
    { testId: 'cerad-delayed' },
    { testId: 'oral-trails', optional: true },
    { testId: 'story-delayed' },
    { testId: 'phonemic-fluency' },
    { testId: 'naming', optional: true },
  ],
};

/** Build doc §2c: ~25 minutes, all five domains, original forms. */
export const LEAN_B2C: BatteryDef = {
  id: 'lean',
  title: 'Weekly check-in',
  items: [
    { testId: 'moca-blind' },
    { testId: 'story-immediate' },
    { testId: 'number-span' },
    { testId: 'category-fluency' },
    { testId: 'oral-trails' },
    { testId: 'phonemic-fluency' },
    { testId: 'story-delayed' },
  ],
};

export const PRESETS: Record<string, BatteryDef> = {
  [LEAN_B2C.id]: LEAN_B2C,
  [TABLE_1_RAVLT.id]: TABLE_1_RAVLT,
  [TABLE_2_CERAD.id]: TABLE_2_CERAD,
};
