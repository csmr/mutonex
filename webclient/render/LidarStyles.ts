export interface OutlineConfig {
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  shadeMode?: number;
  color?: string;
  nearEdgeColor?: string;
  farEdgeColor?: string;
  gapMeters: number;
}

export interface BeamConfig {
  step?: number;
  width?: number;
}

export type LidarPipeline =
  | 'cloud'
  | 'square'
  | 'contour'
  | 'beam'
  | 'procedural';

export interface LidarStyleConfig {
  name: string;
  pipeline: LidarPipeline;
  samplesH: number;
  samplesV: number;
  dotRadiusMin: number;
  dotRadiusMax: number;
  geometryMode?: 'Points' | 'LineSegments';
  outline?: OutlineConfig;
  beam?: BeamConfig;
}

export const LidarStyles: Record<string, LidarStyleConfig> = {
  pointCloud: {
    name: 'pointCloud',
    pipeline: 'cloud',
    geometryMode: 'Points',
    samplesH: 480,
    samplesV: 300,
    dotRadiusMin: 1.0,
    dotRadiusMax: 4.0,
    outline: {
      width: 2.5,
      minWidth: 1.0,
      maxWidth: 15.0,
      shadeMode: 0.0,
      color: '#ff6600',
      nearEdgeColor: '#ff7700',
      farEdgeColor: '#331100',
      gapMeters: 0.5,
    },
  },
  lineLidar: {
    name: 'lineLidar',
    pipeline: 'beam',
    geometryMode: 'Points',
    samplesH: 400,
    samplesV: 290,
    dotRadiusMin: 1.0,
    dotRadiusMax: 5.0,
    outline: {
      width: 2.0,
      minWidth: 1.0,
      maxWidth: 10.0,
      shadeMode: 0.0,
      color: '#ff6600',
      nearEdgeColor: '#ff7700',
      farEdgeColor: '#331100',
      gapMeters: 0.5,
    },
    beam: {
      step: 0.022,
      width: 0.003,
    },
  },
  legacy: {
    name: 'legacy',
    pipeline: 'square',
    geometryMode: 'Points',
    samplesH: 400,
    samplesV: 280,
    dotRadiusMin: 1.0,
    dotRadiusMax: 4.0,
    outline: {
      width: 1.5,
      minWidth: 1.0,
      maxWidth: 8.0,
      shadeMode: 0.0,
      color: '#ff6600',
      nearEdgeColor: '#ff7700',
      farEdgeColor: '#331100',
      gapMeters: 0.5,
    },
  },
  densePointGridVertical: {
    name: 'densePointGridVertical',
    pipeline: 'beam',
    geometryMode: 'Points',
    samplesH: 800,
    samplesV: 560,
    dotRadiusMin: 1.0,
    dotRadiusMax: 6.0,
    outline: {
      width: 3.0,
      minWidth: 1.0,
      maxWidth: 15.0,
      shadeMode: 0.0,
      color: '#ff6600',
      nearEdgeColor: '#ff7700',
      farEdgeColor: '#331100',
      gapMeters: 0.5,
    },
    beam: {
      step: 0.015,
      width: 0.002,
    },
  },
  densePointGridHorizontal: {
    name: 'densePointGridHorizontal',
    pipeline: 'cloud',
    geometryMode: 'Points',
    samplesH: 480,
    samplesV: 300,
    dotRadiusMin: 1.0,
    dotRadiusMax: 4.0,
    outline: {
      width: 2.5,
      minWidth: 1.0,
      maxWidth: 15.0,
      shadeMode: 0.0,
      color: '#ff6600',
      nearEdgeColor: '#ff7700',
      farEdgeColor: '#331100',
      gapMeters: 0.5,
    },
  },
  proceduralLidar: {
    name: 'proceduralLidar',
    pipeline: 'procedural',
    geometryMode: 'Points',
    samplesH: 10,
    samplesV: 10,
    dotRadiusMin: 0.0,
    dotRadiusMax: 0.0,
    outline: {
      width: 2.5,
      minWidth: 1.0,
      maxWidth: 15.0,
      shadeMode: 0.0,
      color: '#ff6600',
      nearEdgeColor: '#ff7700',
      farEdgeColor: '#331100',
      gapMeters: 0.5,
    },
  },
};
