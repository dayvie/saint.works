// Base path for GitHub Pages deployment
// This should match the basePath in next.config.mjs
// In dev, this will be empty string; in prod it will be "/saint.works"
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Video asset paths
// Configure video sources for different orientations
// - desktop: Used for landscape orientation (desktop/tablet landscape)
// - mobile: Used for portrait orientation (mobile/tablet portrait)
//   Set to null to use the desktop video for both orientations (saves bandwidth)
//   Example: mobile: "lighted-candle-mobile.mp4"
export const VIDEO_PATHS = {
  desktop: "bg-reel.mp4", // Desktop/landscape video
  mobile: null as string | null, // Mobile/portrait video - set to path if mobile-specific video exists
} as const;

// Helper function to prefix paths with basePath
export function getAssetPath(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  // If BASE_PATH is empty, just return the path with leading slash
  if (!BASE_PATH) {
    return `/${cleanPath}`;
  }
  return `${BASE_PATH}/${cleanPath}`;
}

