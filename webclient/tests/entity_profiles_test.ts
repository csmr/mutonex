// entity_profiles_test.ts
// Tests EntityProfiles mappings and glyph resolutions.

import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  getCharForEntity,
  getColorForEntity,
  getEntityProfile,
  getGlyphsForType,
} from '../core/EntityProfiles.ts';

Deno.test(
  'EntityProfiles: building_solar_panel maps to ⊞ glyph',
  () => {
    const char = getCharForEntity('building_solar_panel', 'b1');
    assertEquals(char, '⊞');
    const hex = char.codePointAt(0)!.toString(16).toUpperCase();
    assertEquals(hex, '229E');
    const profile = getEntityProfile(hex);
    assertExists(profile);
    assertEquals(profile.name, 'Solar Panel');
  },
);

Deno.test(
  'EntityProfiles: getGlyphsForType resolves known types',
  () => {
    const solar = getGlyphsForType('building_solar_panel');
    assertEquals(solar, ['229E']);
    const tent = getGlyphsForType('building_tent');
    assertEquals(tent, ['1F3AA']);
  },
);

Deno.test(
  'EntityProfiles: getColorForEntity returns numeric color',
  () => {
    const color = getColorForEntity('building_solar_panel');
    assertEquals(color, 0x4682B4);
  },
);
