// Base path for GitHub Pages deployment
// This should match the basePath in next.config.mjs
// In dev, this will be empty string; in prod it will be "/saint.works"
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Video asset paths configuration
// Supports multiple formats for optimal compression and browser compatibility
// Format priority: AV1 (best compression) -> VP9 (good compression) -> H.264 (universal)
// 
// Browser compatibility:
// - AV1: Chrome 70+, Firefox 93+, Edge 79+, Opera 57+ (Safari: Limited)
// - VP9: Chrome 29+, Firefox 28+, Edge 79+, Opera 16+, Safari 14.1+
// - H.264: All modern browsers (universal fallback)
//
// The component automatically detects browser support and selects the best format.
// You only need to provide the formats you've encoded - the component handles selection.
//
// Video encoding recommendations:
// - Desktop: 1920x1080, 2-4 Mbps bitrate
// - Mobile: 1080x1920 or lower, 1-2 Mbps bitrate
// - Remove audio track if video is silent (saves 5-10% file size)
// - Use 2-pass encoding for VP9/H.264, single-pass for AV1
//
// Tools: ffmpeg, HandBrake, or online tools like CloudConvert
export type VideoFormats = {
  av1?: string;  // AV1 (WebM) - best compression (40-60% smaller than H.264)
  vp9?: string;  // VP9 (WebM) - good compression (30-50% smaller than H.264)
  h264: string;  // H.264 (MP4) - universal fallback (required)
};

export type VideoPathsConfig = {
  desktop: VideoFormats; // Desktop/landscape video formats
  mobile: VideoFormats | null; // Mobile/portrait video formats (null = use desktop)
};

export const VIDEO_PATHS: VideoPathsConfig = {
  desktop: {
    av1: "bg-reel.av1.webm",  // Optional
    vp9: "bg-reel.vp9.webm",  // Optional  
    h264: "bg-reel.mp4"        // Required
  },
  mobile: null, // Optional: Set to { av1: "...", vp9: "...", h264: "..." } if mobile video exists
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

