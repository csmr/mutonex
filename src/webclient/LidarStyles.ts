export interface LidarStyleConfig {
    name: string;
    scanMode: number;
    dotType: number;
    samplesH: number;
    samplesV: number;
    dotRadiusMin: number;
    dotRadiusMax: number;
    geometryMode?: 'Points' | 'LineSegments';
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
    },
    lineLidar: {
        name: 'lineLidar',
        geometryMode: 'Points',
        scanMode: 0.0,
        dotType: 1.0,
        samplesH: 400,
        samplesV: 290, // Task 3: dynamic high resolution vertical mode
        dotRadiusMin: 0.0,
        dotRadiusMax: 5.0,
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
    }
};
