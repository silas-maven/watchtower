import { SignalEventType, SignalOverride, SignalState } from '@prisma/client';

export type SignalInput = {
  dailyLow: number | null;
  dailyHigh: number | null;
  targetEntry: number | null;
  targetExit: number | null;
};

export function computeSignalState(input: SignalInput): SignalState {
  const { dailyLow, dailyHigh, targetEntry, targetExit } = input;

  const hasRange = dailyLow != null && dailyHigh != null;

  const entryHit =
    targetEntry != null &&
    ((hasRange && dailyLow <= targetEntry && targetEntry <= dailyHigh) || (dailyHigh != null && targetEntry > dailyHigh));

  const exitHit = targetExit != null && hasRange && dailyLow <= targetExit && targetExit <= dailyHigh;

  if (entryHit && exitHit) return SignalState.BOTH;
  if (entryHit) return SignalState.BUY;
  if (exitHit) return SignalState.SELL;
  return SignalState.NONE;
}

export function eventTypeForTransition(fromState: SignalState, toState: SignalState): SignalEventType | null {
  if (fromState === toState) return null;

  if (toState === SignalState.BUY) return SignalEventType.ENTER_BUY;
  if (toState === SignalState.SELL) return SignalEventType.ENTER_SELL;
  if (toState === SignalState.BOTH) return SignalEventType.ENTER_BOTH;

  if (fromState === SignalState.BUY) return SignalEventType.EXIT_BUY;
  if (fromState === SignalState.SELL) return SignalEventType.EXIT_SELL;
  if (fromState === SignalState.BOTH) return SignalEventType.EXIT_BOTH;

  return null;
}

export function isBuyLike(state: SignalState): boolean {
  return state === SignalState.BUY || state === SignalState.BOTH;
}

export function isSellLike(state: SignalState): boolean {
  return state === SignalState.SELL || state === SignalState.BOTH;
}

/**
 * An owner-set manual override pins the signal regardless of price calculation.
 * Price-driven transitions must not fire while an override is active; the admin
 * route that changes the override is responsible for emitting the SignalEvent.
 */
export function effectiveSignalState(computed: SignalState, override: SignalOverride | null | undefined): SignalState {
  if (override === SignalOverride.FORCE_BUY) return SignalState.BUY;
  if (override === SignalOverride.FORCE_SELL) return SignalState.SELL;
  if (override === SignalOverride.SUPPRESS) return SignalState.NONE;
  return computed;
}

export function isManualState(override: SignalOverride | null | undefined): boolean {
  return override != null;
}
