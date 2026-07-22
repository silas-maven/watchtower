// Weather Outside: deterministic market-regime classifier for the member
// dashboard (client feedback section F). Pure function over the macro tile
// readings so the regime is auditable and testable; no AI involved.

export type WeatherState = 'SUNNY' | 'MIXED' | 'STORMY' | 'FROSTY';

export type WeatherInputs = {
  sp500ChangePct: number | null;
  nasdaqChangePct: number | null;
  bitcoinChangePct: number | null;
  vixLevel: number | null;
  vixChangePct: number | null;
  dxyChangePct: number | null;
  giltChangePct: number | null;
  creditChangePct: number | null; // iTraxx 5Y daily move (or a credit-spread proxy)
  goldChangePct: number | null;
  oilChangePct: number | null;
};

export type WeatherReading = {
  state: WeatherState;
  title: string;
  line1: string;
  line2: string;
  mood: string;
};

// Daily-move thresholds. A risk asset counts as "rising"/"falling" beyond
// RISK_EPS to avoid flapping on flat days; VIX_SHARP_RISE marks a stress spike;
// CREDIT_WIDENING marks spreads moving against risk.
const RISK_EPS = 0.05;
const VIX_SHARP_RISE = 5;
const CREDIT_WIDENING = 1;

const DISPLAY: Record<WeatherState, WeatherReading> = {
  SUNNY: {
    state: 'SUNNY',
    title: 'Sunny',
    line1: 'Risk assets are broadly rising.',
    line2: 'Investors are embracing risk today.',
    mood: 'Risk On',
  },
  MIXED: {
    state: 'MIXED',
    title: 'Mixed',
    line1: 'Markets are sending conflicting signals.',
    line2: 'Proceed selectively.',
    mood: 'Neutral',
  },
  STORMY: {
    state: 'STORMY',
    title: 'Stormy',
    line1: 'Risk assets are under pressure.',
    line2: 'Expect higher volatility.',
    mood: 'Risk Off',
  },
  FROSTY: {
    state: 'FROSTY',
    title: 'Frosty',
    line1: 'Conditions remain cold, but the thaw may be starting.',
    line2: 'Early signs of improvement are emerging.',
    mood: 'Recovery Watch',
  },
};

function direction(change: number | null): -1 | 0 | 1 {
  if (change == null) return 0;
  if (change > RISK_EPS) return 1;
  if (change < -RISK_EPS) return -1;
  return 0;
}

export function classifyWeather(inputs: WeatherInputs): WeatherReading {
  const riskDirs = [inputs.sp500ChangePct, inputs.nasdaqChangePct, inputs.bitcoinChangePct].map(direction);
  const known = [inputs.sp500ChangePct, inputs.nasdaqChangePct, inputs.bitcoinChangePct].filter((v) => v != null);
  const rising = riskDirs.filter((d) => d === 1).length;
  const falling = riskDirs.filter((d) => d === -1).length;

  const vixSharplyUp = (inputs.vixChangePct ?? 0) >= VIX_SHARP_RISE;
  const vixFallingOrStable = (inputs.vixChangePct ?? 0) <= RISK_EPS;
  const vixFalling = direction(inputs.vixChangePct) === -1;
  const creditWidening = (inputs.creditChangePct ?? 0) >= CREDIT_WIDENING;
  const creditHealthy = !creditWidening;
  const giltFalling = direction(inputs.giltChangePct) === -1;

  // No readings at all: nothing to classify.
  if (known.length === 0) return DISPLAY.MIXED;

  // Stormy: risk assets broadly falling with stress confirming (VIX spike,
  // credit widening, or a clean sweep down).
  if (falling >= 2 && (vixSharplyUp || creditWidening || falling === riskDirs.length)) {
    return DISPLAY.STORMY;
  }

  // Frosty: markets still weak, but stress easing (VIX falling) and bond
  // yields falling - the recovery-watch setup.
  if (falling >= 2 && vixFalling && giltFalling) {
    return DISPLAY.FROSTY;
  }

  // Sunny: risk assets broadly rising with VIX contained and credit healthy.
  if (rising >= 2 && falling === 0 && vixFallingOrStable && creditHealthy) {
    return DISPLAY.SUNNY;
  }

  return DISPLAY.MIXED;
}
