// Base path for GitHub Pages deployment
// This should match the basePath in next.config.mjs
// In dev, this will be empty string; in prod it will be "/saint.works"
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Video asset paths configuration
// Supports multiple formats for optimal compression and browser compatibility
// Format priority: WebM (best compression) -> MP4 (universal fallback)
// 
// For best performance:
// 1. Encode videos in WebM (VP9 or AV1 codec) - 30-50% smaller than H.264
// 2. Provide MP4 (H.264) as fallback for older browsers
// 3. Use mobile-specific videos for portrait orientation (lower resolution = smaller files)
//
// Video encoding recommendations:
// - Desktop: 1920x1080, 2-4 Mbps bitrate, WebM (VP9) + MP4 (H.264) fallback
// - Mobile: 1080x1920 or lower, 1-2 Mbps bitrate, WebM (VP9) + MP4 (H.264) fallback
// - Remove audio track if video is silent (saves 5-10% file size)
// - Use 2-pass encoding for best quality/size ratio
//
// Tools: ffmpeg, HandBrake, or online tools like CloudConvert
export type VideoFormats = {
  webm?: string; // WebM format (VP9 or AV1) - best compression
  mp4: string;  // MP4 format (H.264) - universal fallback
};

export type VideoPathsConfig = {
  desktop: VideoFormats; // Desktop/landscape video formats
  mobile: VideoFormats | null; // Mobile/portrait video formats (null = use desktop)
};

export const VIDEO_PATHS: VideoPathsConfig = {
  desktop: {
    webm: "bg-reel.webm", // Optional: Uncomment and add WebM version for 30-50% better compression
    mp4: "bg-reel.mp4",   // Required: H.264 MP4 (universal browser support)
  },
  mobile: null, // Optional: Set to { webm: "bg-reel-mobile.webm", mp4: "bg-reel-mobile.mp4" } if mobile video exists
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

