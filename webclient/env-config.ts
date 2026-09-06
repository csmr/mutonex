declare const __DEV_MODE_ENABLED__: string;

// Overwritten at build time by esbuild. Defaults to "true".
export const DEV_MODE_ENABLED =
  typeof __DEV_MODE_ENABLED__ !== 'undefined'
    ? __DEV_MODE_ENABLED__ !== 'false'
    : true;
