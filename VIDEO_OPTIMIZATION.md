# Video Optimization Guide

This guide explains how to optimize your video files for the web to reduce file size while maintaining quality.

## Quick Start

### Option 1: Using FFmpeg (Recommended)

FFmpeg is a powerful command-line tool for video encoding. Install it from [ffmpeg.org](https://ffmpeg.org/download.html).

**Important Notes:**
- For VP9 2-pass encoding: Use `-b:v` (bitrate) OR `-crf` with `-b:v 0` (quality mode), not both
- For H.264: `-crf` sets quality target, `-maxrate` caps bitrate (both can be used together)
- AV1 encoding is very slow but produces smallest files - consider encoding overnight
- Always test encoded videos in target browsers before deploying

#### Optimize Desktop Video (Landscape)

**Compatibility: H.264 (MP4) > VP9 (WebM) > AV1 (WebM)**

```bash
# Option 1: AV1 (WebM) - BEST compression (~40-60% smaller than H.264)
# Compatibility: Chrome 70+, Firefox 93+, Edge 79+, Opera 57+ (Safari: Limited)
# Note: Encoding is very slow (10-100x slower than H.264)
ffmpeg -i bg-reel-original.mp4 \
  -c:v libaom-av1 \
  -crf 30 \
  -b:v 0 \
  -cpu-used 4 \
  -row-mt 1 \
  -tiles 2x2 \
  -an \
  bg-reel.av1.webm

# Option 2: VP9 (WebM) - GOOD compression (~30-50% smaller than H.264)
# Compatibility: Chrome 29+, Firefox 28+, Edge 79+, Opera 16+, Safari 14.1+
# Recommended: Best balance of compression and encoding speed
ffmpeg -i bg-reel-original.mp4 \
  -c:v libvpx-vp9 \
  -b:v 2M \
  -pass 1 \
  -an \
  -f webm \
  /dev/null

ffmpeg -i bg-reel-original.mp4 \
  -c:v libvpx-vp9 \
  -b:v 2M \
  -pass 2 \
  -an \
  bg-reel.vp9.webm

# Option 3: H.264 (MP4) - UNIVERSAL compatibility (largest file size)
# Compatibility: All modern browsers (Chrome, Firefox, Safari, Edge, Opera)
# Required: Use as fallback for maximum compatibility
ffmpeg -i bg-reel-original.mp4 \
  -c:v libx264 \
  -preset slow \
  -crf 23 \
  -maxrate 3M \
  -bufsize 4M \
  -an \
  -movflags +faststart \
  bg-reel.mp4
```

#### Optimize Mobile Video (Portrait)

**Compatibility: H.264 (MP4) > VP9 (WebM) > AV1 (WebM)**

For mobile, use lower resolution and bitrate to reduce file size.

```bash
# Mobile video filter (maintains aspect ratio, pads to portrait)
SCALE_FILTER="scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2"

# Option 1: AV1 (WebM) - BEST compression for mobile
# Compatibility: Chrome 70+, Firefox 93+, Edge 79+ (Safari: Limited)
ffmpeg -i bg-reel-original.mp4 \
  -vf "$SCALE_FILTER" \
  -c:v libaom-av1 \
  -crf 32 \
  -b:v 0 \
  -cpu-used 4 \
  -row-mt 1 \
  -tiles 2x2 \
  -an \
  bg-reel-mobile.av1.webm

# Option 2: VP9 (WebM) - GOOD compression for mobile
# Compatibility: Chrome 29+, Firefox 28+, Edge 79+, Safari 14.1+
ffmpeg -i bg-reel-original.mp4 \
  -vf "$SCALE_FILTER" \
  -c:v libvpx-vp9 \
  -b:v 1M \
  -pass 1 \
  -an \
  -f webm \
  /dev/null

ffmpeg -i bg-reel-original.mp4 \
  -vf "$SCALE_FILTER" \
  -c:v libvpx-vp9 \
  -b:v 1M \
  -pass 2 \
  -an \
  bg-reel-mobile.vp9.webm

# Option 3: H.264 (MP4) - UNIVERSAL compatibility for mobile
# Compatibility: All modern browsers
ffmpeg -i bg-reel-original.mp4 \
  -vf "$SCALE_FILTER" \
  -c:v libx264 \
  -preset slow \
  -crf 25 \
  -maxrate 1.5M \
  -bufsize 2M \
  -an \
  -movflags +faststart \
  bg-reel-mobile.mp4
```

### Option 2: Using HandBrake (GUI Tool)

1. Download [HandBrake](https://handbrake.fr/)
2. Open your video file
3. **Preset**: Choose "Web > Gmail Large 3 Minutes 720p30" or create custom
4. **Video Codec**: 
   - For WebM: VP9 (if available) or VP8
   - For MP4: H.264 (x264)
5. **Quality**: RF 23-28 (lower = better quality, larger file)
6. **Framerate**: Match source or 30fps (24fps for cinematic)
7. **Audio**: Remove audio track (set to "None") if video is silent
8. **Dimensions**: 
   - Desktop: 1920x1080 or original
   - Mobile: 1080x1920 or lower
9. Click "Start Encode"

### Option 3: Online Tools

- **CloudConvert**: [cloudconvert.com](https://cloudconvert.com/) - Supports VP9, AV1
- **FreeConvert**: [freeconvert.com](https://www.freeconvert.com/video-compressor) - Easy to use
- **Clideo**: [clideo.com](https://clideo.com/compress-video) - Simple interface

## Encoding Settings Explained

### Codecs (Ordered by Compatibility)

1. **H.264 (MP4)** - MOST COMPATIBLE ⭐
   - Universal browser support (Chrome, Firefox, Safari, Edge, Opera)
   - Largest file size but guaranteed compatibility
   - Use as final fallback for maximum compatibility
   - Encoding: Fast

2. **VP9 (WebM)** - GOOD COMPATIBILITY ⭐⭐
   - Supported by Chrome 29+, Firefox 28+, Edge 79+, Opera 16+, Safari 14.1+
   - 30-50% smaller than H.264
   - Best balance of compression and browser support
   - Encoding: Medium speed
   - **Recommended for most use cases**

3. **AV1 (WebM)** - BEST COMPRESSION ⭐⭐⭐
   - Supported by Chrome 70+, Firefox 93+, Edge 79+, Opera 57+ (Safari: Limited)
   - 40-60% smaller than H.264, 10-20% smaller than VP9
   - Future-proof but limited current browser support
   - Encoding: Very slow (10-100x slower than H.264)
   - Use when file size is critical and you can provide fallbacks

### Bitrate Guidelines

- **Desktop (1920x1080)**: 2-4 Mbps
- **Mobile (1080x1920)**: 1-2 Mbps
- **Lower resolution**: Reduce proportionally

### CRF (Constant Rate Factor)

- **Lower = Better Quality, Larger File**
- **VP9**: 30-35 (good balance)
- **H.264**: 23-28 (good balance)

### Key Settings

- **`-an`**: Remove audio track (saves 5-10% if video is silent)
- **`-movflags +faststart`**: Enables progressive download (MP4)
- **`-preset slow`**: Better compression, slower encoding (H.264)
- **2-pass encoding**: Better quality/size ratio (VP9)

## File Size Targets

For a 10-second looping background video:

- **Desktop WebM (VP9)**: 2-4 MB
- **Desktop MP4 (H.264)**: 3-6 MB
- **Mobile WebM (VP9)**: 1-2 MB
- **Mobile MP4 (H.264)**: 1.5-3 MB

## Testing Your Videos

1. Check file sizes - should be significantly smaller than original
2. Test in browser - ensure smooth playback
3. Test on mobile devices - verify performance
4. Check visual quality - ensure acceptable quality for background use

## Updating Your Project

After encoding, update `lib/constants.ts`:

```typescript
export const VIDEO_PATHS: VideoPathsConfig = {
  desktop: {
    av1: "bg-reel.av1.webm",  // Optional: AV1 (best compression)
    vp9: "bg-reel.vp9.webm",  // Optional: VP9 (good compression)
    h264: "bg-reel.mp4",      // Required: H.264 (universal fallback)
  },
  mobile: {
    av1: "bg-reel-mobile.av1.webm",  // Optional: Mobile AV1
    vp9: "bg-reel-mobile.vp9.webm",  // Optional: Mobile VP9
    h264: "bg-reel-mobile.mp4",      // Optional: Mobile H.264
  },
};
```

**Note**: The component automatically detects browser support and selects the best available format. You only need to provide the formats you've encoded - the component handles the rest!

## Format Selection Strategy

The component automatically detects browser support and selects the best format:

1. **AV1** (if supported) → Smallest file size
2. **VP9** (if AV1 not supported) → Good compression
3. **H.264** (fallback) → Universal compatibility

This ensures users get the best compression their browser supports while maintaining compatibility.

## Troubleshooting

**Video won't play in browser:**
- Ensure MP4 fallback is provided
- Check video codec compatibility
- Verify file paths in constants.ts

**File size still too large:**
- Reduce bitrate further
- Lower resolution
- Increase CRF value
- Remove audio if present

**Quality too low:**
- Increase bitrate
- Lower CRF value
- Use slower preset (better compression)

