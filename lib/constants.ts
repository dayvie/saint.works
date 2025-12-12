// Base path for GitHub Pages deployment
// This should match the basePath in next.config.mjs
// In dev, this will be empty string; in prod it will be "/saint.works"
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

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

