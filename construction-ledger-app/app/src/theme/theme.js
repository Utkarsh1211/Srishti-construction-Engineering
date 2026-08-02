/**
 * Design direction: a site-office ledger, not a consumer fintech app.
 * Palette pulls from blueprint paper and steel — deep ink-blue surfaces,
 * a warm signal-orange reserved only for debits/alerts, and a clean
 * working-green for credits. Numbers are the hero, so type leans on
 * tabular figures and generous weight contrast rather than decoration.
 */

export const colors = {
  ink: '#16232E',        // primary dark surface (headers, nav)
  inkLight: '#22364A',   // secondary dark surface (cards on dark)
  steel: '#4C7188',      // primary accent — links, active states
  steelLight: '#DCE7EC', // pale steel tint for chips/backgrounds
  paper: '#F6F5F1',      // app background — warm blueprint-paper white
  paperDim: '#EAE8E1',   // input backgrounds, dividers
  credit: '#2F7D5E',     // money in — working green
  creditBg: '#E4F1EA',
  debit: '#C8622A',      // money out — signal orange (not red; construction, not alarm)
  debitBg: '#F7E7DC',
  ink70: '#5B6B78',       // secondary text on light
  ink40: '#93A0AA',       // tertiary text / placeholders
  white: '#FFFFFF',
  border: '#DCD9D0',
  danger: '#B23A3A'
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999
};

export const type = {
  display: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  h1: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  h2: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6 },
  amount: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  amountLarge: { fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.5 }
};

export default { colors, spacing, radii, type };
