import { describe, expect, it } from 'vitest';
import { classifyWeather, type WeatherInputs } from '@/lib/market/weather';

const base: WeatherInputs = {
  sp500ChangePct: 0,
  nasdaqChangePct: 0,
  bitcoinChangePct: 0,
  vixLevel: 15,
  vixChangePct: 0,
  dxyChangePct: 0,
  giltChangePct: 0,
  creditChangePct: 0,
  goldChangePct: 0,
  oilChangePct: 0,
};

describe('classifyWeather', () => {
  it('sunny when risk assets rise with VIX contained and credit healthy', () => {
    const out = classifyWeather({ ...base, sp500ChangePct: 0.4, nasdaqChangePct: 0.6, bitcoinChangePct: 1.9, vixChangePct: -2.7 });
    expect(out.state).toBe('SUNNY');
    expect(out.mood).toBe('Risk On');
  });

  it('stormy when risk assets fall and VIX spikes', () => {
    const out = classifyWeather({ ...base, sp500ChangePct: -1.2, nasdaqChangePct: -1.8, bitcoinChangePct: 0.2, vixChangePct: 9 });
    expect(out.state).toBe('STORMY');
  });

  it('stormy on a clean sweep down even without a VIX spike', () => {
    const out = classifyWeather({ ...base, sp500ChangePct: -0.5, nasdaqChangePct: -0.4, bitcoinChangePct: -2, vixChangePct: 1 });
    expect(out.state).toBe('STORMY');
  });

  it('frosty when markets are weak but VIX and gilt yields are falling', () => {
    const out = classifyWeather({ ...base, sp500ChangePct: -0.5, nasdaqChangePct: -0.3, bitcoinChangePct: 0.4, vixChangePct: -3, giltChangePct: -0.8 });
    expect(out.state).toBe('FROSTY');
    expect(out.mood).toBe('Recovery Watch');
  });

  it('mixed on conflicting signals', () => {
    const out = classifyWeather({ ...base, sp500ChangePct: 0.5, nasdaqChangePct: -0.5, bitcoinChangePct: 0.02 });
    expect(out.state).toBe('MIXED');
  });

  it('sunny blocked by credit widening', () => {
    const out = classifyWeather({ ...base, sp500ChangePct: 0.4, nasdaqChangePct: 0.6, bitcoinChangePct: 1.9, vixChangePct: -1, creditChangePct: 2.5 });
    expect(out.state).toBe('MIXED');
  });

  it('mixed when no readings are available', () => {
    const out = classifyWeather({ ...base, sp500ChangePct: null, nasdaqChangePct: null, bitcoinChangePct: null });
    expect(out.state).toBe('MIXED');
  });
});
