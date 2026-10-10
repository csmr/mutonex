// webclient/core/GameRules.ts

export type GameMode = 'default' | 'beginner' | 'fast';

export type Rules = {
  turnIntervalMs: number;
  mode: GameMode;
  maintenanceCost: number;
  energyDepletion: number;
};

export const TURNS = {
  default: 17000,
  beginner: 34000,
  fast: 0,
} as const;

export const DEFAULTS: Rules = {
  turnIntervalMs: 17000,
  mode: 'default',
  maintenanceCost: 3,
  energyDepletion: 0.5,
};

export const updateRules =
  (p: Partial<Rules>) => (r: Rules): Rules => ({
    ...r,
    ...p,
  });

export const setMode = (m: GameMode) => (r: Rules): Rules => ({
  ...r,
  mode: m,
  turnIntervalMs: TURNS[m],
});

export const store = (init = DEFAULTS) => {
  let cur = init;
  const subs = new Set<(r: Rules) => void>();
  return {
    get: () => cur,
    sub: (f: (r: Rules) => void) => (
      subs.add(f), () => subs.delete(f)
    ),
    dispatch: (t: (r: Rules) => Rules) => {
      cur = t(cur);
      subs.forEach((f) => f(cur));
    },
  };
};
