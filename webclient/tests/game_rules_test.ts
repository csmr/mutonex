// game_rules_test.ts
//
// Deno unit tests for GameRules store & TurnTimer integration.
// Run: deno test webclient/tests/game_rules_test.ts

import {
  assertEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  DEFAULTS,
  setMode,
  store,
  TURNS,
  updateRules,
} from '../core/GameRules.ts';

(globalThis as any).window = {
  ...(globalThis as any).window || {},
  addEventListener() {},
  removeEventListener() {},
  innerWidth: 1024,
  innerHeight: 768,
};

class MockVector3 {
  set() {}
}

(globalThis as any).THREE = {
  Scene: class {
    add() {}
  },
  OrthographicCamera: class {
    position = new MockVector3();
    updateProjectionMatrix() {}
  },
  ShaderMaterial: class {
    uniforms = {
      uProgress: { value: 1.0 },
      uActiveColor: { value: {} },
      uTrackColor: { value: {} },
    };
  },
  Mesh: class {
    visible = true;
    position = new MockVector3();
  },
  RingGeometry: class {},
  Color: class {},
  DoubleSide: 2,
};

const { TurnTimer } = await import('../view/TurnTimer.ts');

Deno.test(
  'GameRules: store initializes with DEFAULTS',
  () => {
    const s = store();
    const rules = s.get();
    assertEquals(rules.turnIntervalMs, 17000);
    assertEquals(rules.mode, 'default');
    assertEquals(rules.maintenanceCost, 3);
    assertEquals(rules.energyDepletion, 0.5);
  },
);

Deno.test(
  'GameRules: setMode pure transformer updates rules',
  () => {
    const s = store();

    s.dispatch(setMode('beginner'));
    assertEquals(s.get().mode, 'beginner');
    assertEquals(s.get().turnIntervalMs, 34000);

    s.dispatch(setMode('fast'));
    assertEquals(s.get().mode, 'fast');
    assertEquals(s.get().turnIntervalMs, 0);
  },
);

Deno.test(
  'GameRules: sub notifies subscribers on dispatch',
  () => {
    const s = store();
    let notified = false;
    s.sub(() => {
      notified = true;
    });

    s.dispatch(updateRules({ maintenanceCost: 5 }));
    assertEquals(notified, true);
    assertEquals(s.get().maintenanceCost, 5);
  },
);

Deno.test(
  'TurnTimer: consumes Rules store and handles fast mode',
  () => {
    const s = store();
    const timer = new TurnTimer();

    timer.setRules(s.get());
    timer.startTimer();
    assertEquals(timer.isTimerActive, true);
    assertEquals(timer.timerDuration, 17000);

    s.dispatch(setMode('fast'));
    timer.setRules(s.get());
    timer.startTimer();
    assertEquals(timer.isTimerActive, false);
  },
);
