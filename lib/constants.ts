// Base path for GitHub Pages deployment
// This should match the basePath in next.config.ts
export const BASE_PATH = "/saint.works";

// Helper function to prefix paths with basePath
export function getAssetPath(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${BASE_PATH}/${cleanPath}`;
}

