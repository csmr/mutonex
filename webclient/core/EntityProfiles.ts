import './global_types.ts';
import data from '../../content/res/glyph_profiles.json' with {
  type: 'json',
};

interface GlyphDef {
  name: string;
  types: string[];
  scale?: number;
  elevateY?: number;
  facing?: string;
  isStationary?: boolean;
}
type Defaults = Omit<GlyphDef, 'name' | 'types'>;

const defaults = data.defaults as Record<string, Defaults>;
const glyphDefs = data.glyphs as Record<string, GlyphDef>;
const NO_DEFAULTS: Defaults = {};

export interface EntityProfile {
  hex: string;
  name: string;
  types: readonly string[];
  scale: number;
  elevateY: number;
  facing: string;
  isStationary: boolean;
}

export const resolveGlyph = (hex: string): EntityProfile => {
  const d = glyphDefs[hex.toUpperCase()];
  if (!d) throw new Error(`Unknown glyph: '${hex}'`);
  if (!d.types || d.types.length === 0) {
    throw new Error(`Glyph ${hex} ('${d.name}') has no types`);
  }
  const base = defaults[d.types[0]] ?? NO_DEFAULTS;
  return {
    hex: hex.toUpperCase(),
    name: d.name,
    types: d.types,
    scale: d.scale ?? base.scale ?? 1.0,
    elevateY: d.elevateY ?? base.elevateY ?? 0,
    facing: d.facing ?? base.facing ?? 'front',
    isStationary: d.isStationary ?? base.isStationary ?? true,
  };
};

const profiles = new Map<string, EntityProfile>();
const glyphsByType = new Map<string, string[]>();

function indexGlyphProfiles() {
  for (const hex of Object.keys(glyphDefs)) {
    const p = resolveGlyph(hex);
    profiles.set(p.hex, p);
    for (const t of p.types) {
      const list = glyphsByType.get(t) ?? [];
      list.push(p.hex);
      glyphsByType.set(t, list);
    }
  }
}
indexGlyphProfiles();

export const getEntityProfile = (
  key: string,
): EntityProfile | undefined => {
  if (typeof key !== 'string') return undefined;
  const upper = key.toUpperCase();
  if (profiles.has(upper)) return profiles.get(upper);
  const glyphs = getGlyphsForType(key);
  if (glyphs.length > 0) return profiles.get(glyphs[0]);
  return undefined;
};

export const getGlyphsForType = (
  type: string,
): readonly string[] => {
  if (typeof type !== 'string') return [];
  const normType = type.replace(/^(building_|item_)/, '');
  const list = glyphsByType.get(normType) ?? glyphsByType.get(type);
  if (!list) return [];
  return list;
};

export const getGlyphChar = (p: EntityProfile | string): string => {
  const hex = typeof p === 'string'
    ? (profiles.get(p.toUpperCase())?.hex ||
      getGlyphsForType(p)[0] ||
      '1F3AA')
    : p.hex;
  return String.fromCodePoint(parseInt(hex, 16));
};
