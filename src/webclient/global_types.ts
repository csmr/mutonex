
// This file acts as a central place for global type declarations to avoid conflicts
// and provide 'THREE' namespace to the project.

// We declare 'THREE' as 'any' to bypass strict type checking for the CDN version,
// or we could try to import types if we had them.
// For the purpose of this task (no npm install), 'any' is safest.
declare global {
    const THREE: any;
    const OrbitControls: any;

    // We can also augment the window object
    interface Window {
        THREE: any;
        Phoenix: any;
    }
}

// Ensure this file is treated as a module
export {};
