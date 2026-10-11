export interface OutlineConfig {
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  shadeMode?: number;
  color?: string;
  nearEdgeColor?: string;
  farEdgeColor?: string;
  depthThreshold: number;
}

export interface LidarStyleConfig {
  name: string;
  scanMode: number;
  dotType: number;
  samplesH: number;
  samplesV: number;
  dotRadiusMin: number;
  dotRadiusMax: number;
  geometryMode?: 'Points' | 'LineSegments';
  outline?: OutlineConfig;
}

export const LidarStyles: Record<string, LidarStyleConfig> = {
  pointCloud: {
    name: 'pointCloud',
    geometryMode: 'Points',
    scanMode: 1.0,
    dotType: 1.0,
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
      depthThreshold: 0.04,
    },
  },
  lineLidar: {
    name: 'lineLidar',
    geometryMode: 'Points',
    scanMode: 0.0,
    dotType: 1.0,
    samplesH: 400,
    samplesV: 290,
    dotRadiusMin: 0.0,
    dotRadiusMax: 5.0,
    outline: {
      width: 2.0,
      minWidth: 1.0,
      maxWidth: 10.0,
      shadeMode: 0.0,
      color: '#ff6600',
      nearEdgeColor: '#ff7700',
      farEdgeColor: '#331100',
      depthThreshold: 0.04,
    },
  },
  legacy: {
    name: 'legacy',
    geometryMode: 'Points',
    scanMode: 1.0,
    dotType: 0.0,
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
      depthThreshold: 0.05,
    },
  },
  densePointGridVertical: {
    name: 'densePointGridVertical',
    geometryMode: 'Points',
    scanMode: 0.0,
    dotType: 1.0,
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
      depthThreshold: 0.03,
    },
  },
  densePointGridHorizontal: {
    name: 'densePointGridHorizontal',
    geometryMode: 'Points',
    scanMode: 1.0,
    dotType: 1.0,
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
      depthThreshold: 0.04,
    },
  },
  proceduralLidar: {
    name: 'proceduralLidar',
    geometryMode: 'Points',
    scanMode: 0.0,
    dotType: 0.0,
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
      depthThreshold: 0.04,
    },
  },
};
