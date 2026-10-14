import { LidarPipeline, LidarStyleConfig } from './LidarStyles.ts';

export interface DerivedUniforms {
  scanMode: number;
  dotType: number;
  beamMode: number;
  beamStep: number;
  beamWidth: number;
  dotRadiusMin: number;
  dotRadiusMax: number;
}

export function deriveUniforms(
  config: LidarStyleConfig,
): DerivedUniforms {
  const p: LidarPipeline = config.pipeline || 'cloud';

  let scanMode = 1.0;
  let dotType = 1.0;
  let beamMode = 0.0;

  if (p === 'cloud') {
    scanMode = 1.0;
    dotType = 1.0;
    beamMode = 0.0;
  } else if (p === 'square') {
    scanMode = 1.0;
    dotType = 0.0;
    beamMode = 0.0;
  } else if (p === 'contour') {
    scanMode = 0.0;
    dotType = 1.0;
    beamMode = 0.0;
  } else if (p === 'beam') {
    scanMode = 0.0;
    dotType = 1.0;
    beamMode = 1.0;
  } else if (p === 'procedural') {
    scanMode = 0.0;
    dotType = 0.0;
    beamMode = 0.0;
  }

  return {
    scanMode,
    dotType,
    beamMode,
    beamStep: config.beam?.step ?? 0.022,
    beamWidth: config.beam?.width ?? 0.003,
    dotRadiusMin: config.dotRadiusMin ?? 1.0,
    dotRadiusMax: config.dotRadiusMax ?? 4.0,
  };
}
