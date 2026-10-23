import {
  assertEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LidarStyles } from '../render/LidarStyles.ts';
import { deriveUniforms } from '../render/StyleUniforms.ts';

Deno.test('deriveUniforms: cloud pipeline maps scanMode 1.0, dotType 1.0, beamMode 0.0', () => {
  const u = deriveUniforms(LidarStyles.pointCloud);
  assertEquals(u.scanMode, 1.0);
  assertEquals(u.dotType, 1.0);
  assertEquals(u.beamMode, 0.0);
});

Deno.test('deriveUniforms: beam pipeline maps scanMode 0.0, dotType 1.0, beamMode 1.0', () => {
  const u = deriveUniforms(LidarStyles.lineLidar);
  assertEquals(u.scanMode, 0.0);
  assertEquals(u.dotType, 1.0);
  assertEquals(u.beamMode, 1.0);
  assertEquals(u.beamStep, 0.022);
  assertEquals(u.beamWidth, 0.003);
});

Deno.test('deriveUniforms: square pipeline maps scanMode 1.0, dotType 0.0, beamMode 0.0', () => {
  const u = deriveUniforms(LidarStyles.legacy);
  assertEquals(u.scanMode, 1.0);
  assertEquals(u.dotType, 0.0);
  assertEquals(u.beamMode, 0.0);
});

Deno.test('deriveUniforms: procedural pipeline maps scanMode 0.0, dotType 0.0, beamMode 0.0', () => {
  const u = deriveUniforms(LidarStyles.proceduralLidar);
  assertEquals(u.scanMode, 0.0);
  assertEquals(u.dotType, 0.0);
  assertEquals(u.beamMode, 0.0);
});

Deno.test('deriveUniforms: enumerates all LidarStyles without invalid combinations or NaN values', () => {
  for (const [name, style] of Object.entries(LidarStyles)) {
    const u = deriveUniforms(style);
    assertEquals(
      Number.isNaN(u.scanMode),
      false,
      `${name} scanMode is NaN`,
    );
    assertEquals(
      Number.isNaN(u.dotType),
      false,
      `${name} dotType is NaN`,
    );
    assertEquals(
      Number.isNaN(u.beamMode),
      false,
      `${name} beamMode is NaN`,
    );
    assertEquals(
      Number.isNaN(u.beamStep),
      false,
      `${name} beamStep is NaN`,
    );
    assertEquals(
      Number.isNaN(u.beamWidth),
      false,
      `${name} beamWidth is NaN`,
    );
    assertEquals(
      Number.isNaN(u.dotRadiusMin),
      false,
      `${name} dotRadiusMin is NaN`,
    );
    assertEquals(
      Number.isNaN(u.dotRadiusMax),
      false,
      `${name} dotRadiusMax is NaN`,
    );
  }
});
