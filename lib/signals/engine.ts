import { SignalEventType, SignalState } from '@prisma/client';

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
