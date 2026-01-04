# Video Optimization Guide

This guide explains how to optimize your video files for the web to reduce file size while maintaining quality.

## Quick Start

### Option 1: Using FFmpeg (Recommended)

FFmpeg is a powerful command-line tool for video encoding. Install it from [ffmpeg.org](https://ffmpeg.org/download.html).

#### Optimize Desktop Video (Landscape)

```bash
# Create optimized WebM (VP9) - best compression (~30-50% smaller than H.264)
ffmpeg -i bg-reel-original.mp4 \
  -c:v libvpx-vp9 \
  -b:v 2M \
  -crf 30 \
  -pass 1 \
  -an \
  -f webm \
  /dev/null

ffmpeg -i bg-reel-original.mp4 \
  -c:v libvpx-vp9 \
  -b:v 2M \
  -crf 30 \
  -pass 2 \
  -an \
  bg-reel.webm

# Create optimized MP4 (H.264) - universal fallback
ffmpeg -i bg-reel-original.mp4 \
  -c:v libx264 \
  -preset slow \
  -crf 23 \
  -b:v 2M \
  -maxrate 3M \
  -bufsize 4M \
  -an \
  -movflags +faststart \
  bg-reel.mp4
```

#### Optimize Mobile Video (Portrait)

```bash
# For mobile, use lower resolution and bitrate
# WebM version
ffmpeg -i bg-reel-original.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -c:v libvpx-vp9 \
  -b:v 1M \
  -crf 32 \
  -pass 1 \
  -an \
  -f webm \
  /dev/null

ffmpeg -i bg-reel-original.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -c:v libvpx-vp9 \
  -b:v 1M \
  -crf 32 \
  -pass 2 \
  -an \
  bg-reel-mobile.webm

# MP4 version
ffmpeg -i bg-reel-original.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 \
  -preset slow \
  -crf 25 \
  -b:v 1M \
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

### Codecs

1. **VP9 (WebM)**: 
   - Best compression (30-50% smaller than H.264)
   - Supported by Chrome, Firefox, Edge, Opera
   - Use for primary format

2. **H.264 (MP4)**:
   - Universal browser support
   - Larger file size but guaranteed compatibility
   - Use as fallback

3. **AV1 (WebM)**:
   - Even better compression than VP9 (40-60% smaller)
   - Limited browser support (Chrome, Firefox, Edge)
   - Future-proof option

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
    webm: "bg-reel.webm",  // Your optimized WebM file
    mp4: "bg-reel.mp4",    // Your optimized MP4 file
  },
  mobile: {
    webm: "bg-reel-mobile.webm",  // Optional mobile WebM
    mp4: "bg-reel-mobile.mp4",    // Optional mobile MP4
  },
};
```

## Advanced: AV1 Codec (Future-Proof)

For even better compression (when browser support improves):

```bash
# AV1 encoding (requires libaom-av1)
ffmpeg -i bg-reel-original.mp4 \
  -c:v libaom-av1 \
  -crf 30 \
  -b:v 0 \
  -cpu-used 4 \
  -an \
  bg-reel.av1.webm
```

Note: AV1 encoding is very slow but produces the smallest files.

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

