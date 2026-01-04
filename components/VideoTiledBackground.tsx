"use client";

import { useEffect, useRef } from "react";
import { getAssetPath, VIDEO_PATHS, VideoFormats } from "../lib/constants";

/**
 * Detect browser support for video codecs
 * Returns the best supported format in order: AV1 > VP9 > H.264
 */
function detectVideoCodecSupport(): {
  supportsAV1: boolean;
  supportsVP9: boolean;
  supportsH264: boolean;
} {
  if (typeof window === "undefined" || !document.createElement) {
    // Server-side or no DOM - assume minimal support
    return { supportsAV1: false, supportsVP9: false, supportsH264: true };
  }

  const video = document.createElement("video");
  
  // Check AV1 support
  const supportsAV1 = video.canPlayType('video/webm; codecs="av01.0.05M.08"') !== "";
  
  // Check VP9 support
  const supportsVP9 = video.canPlayType('video/webm; codecs="vp9"') !== "";
  
  // Check H.264 support (should always be true, but check anyway)
  const supportsH264 = video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== "" ||
                       video.canPlayType('video/mp4') !== "";

  return { supportsAV1, supportsVP9, supportsH264 };
}

/**
 * Helper function to set video sources with intelligent format selection
 * Automatically selects the best format based on browser support:
 * Priority: AV1 (best compression) > VP9 (good compression) > H.264 (universal)
 */
function setVideoSources(video: HTMLVideoElement, formats: VideoFormats) {
  // Clear existing sources
  video.innerHTML = "";
  
  const codecSupport = detectVideoCodecSupport();
  
  // Add sources in order of preference (browser will use first supported format)
  // 1. AV1 (best compression) - if browser supports it and file exists
  if (codecSupport.supportsAV1 && formats.av1) {
    const av1Source = document.createElement("source");
    av1Source.src = getAssetPath(formats.av1);
    av1Source.type = 'video/webm; codecs="av01.0.05M.08"';
    video.appendChild(av1Source);
  }
  
  // 2. VP9 (good compression) - if browser supports it and file exists
  if (codecSupport.supportsVP9 && formats.vp9) {
    const vp9Source = document.createElement("source");
    vp9Source.src = getAssetPath(formats.vp9);
    vp9Source.type = 'video/webm; codecs="vp9"';
    video.appendChild(vp9Source);
  }
  
  // 3. H.264 (universal fallback) - always include as final fallback
  if (formats.h264) {
    const h264Source = document.createElement("source");
    h264Source.src = getAssetPath(formats.h264);
    h264Source.type = 'video/mp4; codecs="avc1.42E01E"';
    video.appendChild(h264Source);
  }
}

/**
 * Type definitions for video elements
 * Contains references to landscape and portrait orientation video elements
 */
type VideoElements = {
  landscape: HTMLVideoElement | null;
  portrait: HTMLVideoElement | null;
};

/**
 * Options passed to VideoTiledBackgroundController constructor
 */
type ControllerOptions = {
  canvas: HTMLCanvasElement;
  videos: VideoElements;
};

/**
 * VideoTiledBackgroundController
 * 
 * Manages WebGL-based tiled video background rendering.
 * Uses WebGL shaders to create a seamless tiled pattern from video frames.
 * Falls back to standard HTML5 video if WebGL is unavailable.
 */
class VideoTiledBackgroundController {
  // Canvas element for WebGL rendering
  private canvas: HTMLCanvasElement;
  // Video element references (landscape and portrait orientations)
  private videos: VideoElements;
  // WebGL rendering context
  private gl: WebGLRenderingContext | null;
  // Compiled WebGL shader program
  private program: WebGLProgram | null = null;
  // Buffer containing vertex positions for the fullscreen quad
  private positionBuffer: WebGLBuffer | null = null;
  // Texture used to store video frames
  private texture: WebGLTexture | null = null;
  // Location of the position attribute in the shader program
  private positionLocation: number | null = null;
  // Uniform locations for shader parameters
  private uniforms: {
    canvasSize: WebGLUniformLocation | null;
    displayVideoSize: WebGLUniformLocation | null;
    flipY: WebGLUniformLocation | null;
    texture: WebGLUniformLocation | null;
  } = {
    canvasSize: null,
    displayVideoSize: null,
    flipY: null,
    texture: null,
  };
  // Currently active video element being used for rendering
  private activeVideo: HTMLVideoElement | null = null;
  // Flag to indicate if video texture needs to be uploaded to GPU
  private needsTextureUpload = false;
  // Flag to track if video has loaded metadata (for showing first frame in Safari)
  private videoMetadataLoaded = false;
  // RequestAnimationFrame handle for the render loop
  private animationHandle: number | null = null;
  // Media query for orientation changes
  private mediaQuery: MediaQueryList | null = null;
  // Track if user interaction has occurred (required for Safari autoplay)
  private hasUserInteracted: boolean = false;
  // User interaction handler
  private handleUserInteraction: () => void;
  // Resize event handler
  private handleResize: () => void;
  // Orientation change event handler
  private handleOrientation: () => void;

  /**
   * Constructor
   * Initializes the controller with canvas and video elements.
   * Sets up WebGL context and prepares event handlers.
   */
  constructor({ canvas, videos }: ControllerOptions) {
    this.canvas = canvas;
    this.videos = videos;
    // Get WebGL context without alpha channel for better performance
    this.gl = this.canvas.getContext("webgl", { alpha: false, antialias: true });
    // Set up media query to detect orientation changes
    this.mediaQuery = typeof window !== "undefined"
      ? window.matchMedia("(orientation: portrait)")
      : null;

    this.prepareVideos();

    // Handle window resize - update WebGL canvas size and reselect video if needed
    this.handleResize = () => {
      if (this.gl) {
        this.resize();
        void this.selectVideo();
      } else {
        // If WebGL unavailable, use fallback video
        this.enableFallbackVideo();
      }
    };

    // Handle orientation changes - reselect appropriate video (landscape/portrait)
    this.handleOrientation = () => {
      if (this.gl) {
        void this.selectVideo();
      } else {
        this.enableFallbackVideo();
      }
    };

    // Handle user interaction - required for autoplay policies
    // Browsers block autoplay until user interacts
    this.handleUserInteraction = () => {
      if (this.hasUserInteracted) return;
      
      this.hasUserInteracted = true;
      
      // Try to play all videos (active and inactive) to ensure one starts
      const playAllVideos = async () => {
        if (this.activeVideo) {
          // Force play the active video
          try {
            this.activeVideo.play().catch(() => {});
          } catch (e) {
            // Ignore errors
          }
        }
        
        // Also try to play both videos to ensure one works
        if (this.videos.landscape) {
          try {
            this.videos.landscape.play().catch(() => {});
          } catch (e) {
            // Ignore errors
          }
        }
        if (this.videos.portrait) {
          try {
            this.videos.portrait.play().catch(() => {});
          } catch (e) {
            // Ignore errors
          }
        }
        
        // If no active video yet, try to select and play
        if (!this.activeVideo) {
          void this.selectVideo();
        }
      };
      
      // Play immediately and also after a short delay (Safari sometimes needs this)
      playAllVideos();
      setTimeout(playAllVideos, 50);
      
      // Remove event listeners after first interaction
      this.removeUserInteractionListeners();
    };
  }

  /**
   * Initialize the controller
   * Attaches event listeners and initializes WebGL.
   * Falls back to standard video if WebGL is unavailable or fails.
   */
  async initialize() {
    this.attachEvents();

    if (!this.gl) {
      console.warn("WebGL unavailable. Falling back to plain video background.");
      this.enableFallbackVideo();
      return;
    }

    try {
      await this.initGL();
    } catch (error) {
      console.warn("WebGL initialization failed; falling back to video.", error);
      this.disposeGL();
      this.gl = null;
      this.enableFallbackVideo();
    }
  }

  /**
   * Cleanup and dispose of resources
   * Stops animation loop, removes event listeners, and cleans up WebGL resources.
   */
  dispose() {
    if (this.animationHandle !== null) {
      cancelAnimationFrame(this.animationHandle);
      this.animationHandle = null;
    }

    window.removeEventListener("resize", this.handleResize);
    if (this.mediaQuery) {
      if (typeof this.mediaQuery.removeEventListener === "function") {
        this.mediaQuery.removeEventListener("change", this.handleOrientation);
      } else if (typeof this.mediaQuery.removeListener === "function") {
        this.mediaQuery.removeListener(this.handleOrientation);
      }
    }

    // Remove user interaction listeners
    this.removeUserInteractionListeners();

    this.disposeGL();
    this.pauseVideo(this.activeVideo);
  }

  /**
   * Prepare video elements for playback
   * Sets up videos to be muted and play inline (required for autoplay in most browsers).
   * Optimizes preload strategy - only the active video gets full preload.
   */
  private prepareVideos() {
    Object.values(this.videos).forEach((video) => {
      if (!video) return;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.loop = true;
      // Set preload to metadata for inactive videos to save bandwidth
      // The active video will be set to "auto" in selectVideo()
      video.preload = "metadata";
    });
  }

  /**
   * Attach event listeners for resize and orientation changes
   */
  private attachEvents() {
    window.addEventListener("resize", this.handleResize);
    if (this.mediaQuery) {
      if (typeof this.mediaQuery.addEventListener === "function") {
        this.mediaQuery.addEventListener("change", this.handleOrientation);
      } else if (typeof this.mediaQuery.addListener === "function") {
        this.mediaQuery.addListener(this.handleOrientation);
      }
    }
    
    // Attach user interaction listeners for Safari autoplay
    this.attachUserInteractionListeners();
  }

  /**
   * Attach user interaction listeners to enable video playback
   * Browsers require user interaction before allowing video playback
   */
  private attachUserInteractionListeners() {
    // Listen to multiple interaction events to catch any user action
    const events = ["click", "touchstart", "touchend", "mousedown", "keydown"];
    const options = { passive: true, once: true };
    
    events.forEach((event) => {
      document.addEventListener(event, this.handleUserInteraction, options);
    });
  }

  /**
   * Remove user interaction listeners after first interaction
   */
  private removeUserInteractionListeners() {
    const events = ["click", "touchstart", "touchend", "mousedown", "keydown"];
    
    events.forEach((event) => {
      document.removeEventListener(event, this.handleUserInteraction);
    });
  }

  /**
   * Initialize WebGL resources
   * Creates shader program, buffers, and texture.
   * Selects appropriate video and starts render loop.
   */
  private async initGL() {
    this.createProgram();
    this.createBuffers();
    this.createTexture();
    await this.selectVideo();
    this.resize(true);
    this.renderFrame();
  }

  /**
   * Dispose of WebGL resources
   * Cleans up textures, buffers, and shader programs.
   */
  private disposeGL() {
    if (!this.gl) return;

    const { gl } = this;
    if (this.texture) {
      gl.deleteTexture(this.texture);
      this.texture = null;
    }
    if (this.positionBuffer) {
      gl.deleteBuffer(this.positionBuffer);
      this.positionBuffer = null;
    }
    if (this.program) {
      gl.deleteProgram(this.program);
      this.program = null;
    }
  }

  /**
   * Create and compile WebGL shader program
   * 
   * Vertex shader: Transforms 2D positions and generates UV coordinates
   * Fragment shader: Implements tiling logic - calculates which tile to sample
   *                  and maps UV coordinates to create seamless tiling pattern
   */
  private createProgram() {
    const gl = this.gl;
    if (!gl) return;

    // Vertex shader: Simple pass-through that generates UV coordinates
    // Takes position from -1 to 1 and converts to UV 0 to 1
    const vertexSrc = `
      attribute vec2 a_position;
      varying vec2 v_uv;

      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Fragment shader: Implements tiling algorithm
    // Calculates tile indices and local coordinates within each tile
    // Samples the video texture at the correct UV coordinates to create seamless tiling
    const fragmentSrc = `
      precision mediump float;

      uniform sampler2D u_texture;
      uniform vec2 u_canvasSize;
      uniform vec2 u_displayVideoSize;
      uniform float u_flipY;
      varying vec2 v_uv;

      void main() {
        // Calculate offset based on canvas and video sizes
        vec2 offset = (v_uv - 0.5) * u_canvasSize / u_displayVideoSize;
        vec2 scaled = offset + 0.5;
        // Determine which tile we're in
        vec2 tileIndex = floor(scaled);
        // Get local coordinates within the tile (0-1 range)
        vec2 localCoord = scaled - tileIndex;
        vec2 videoUV = localCoord;
        // Flip Y coordinate if needed (video textures are often flipped)
        videoUV.y = (u_flipY > 0.5) ? 1.0 - videoUV.y : videoUV.y;
        // Clamp to avoid edge sampling issues
        videoUV = clamp(videoUV, 0.001, 0.999);
        gl_FragColor = texture2D(u_texture, videoUV);
      }
    `;

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSrc);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSrc);
    if (!vertexShader || !fragmentShader) {
      throw new Error("Failed to compile shaders.");
    }

    const program = gl.createProgram();
    if (!program) {
      throw new Error("Failed to create WebGL program.");
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program) ?? "Unknown error";
      gl.deleteProgram(program);
      throw new Error(`WebGL program failed: ${info}`);
    }

    gl.useProgram(program);
    this.program = program;

    this.uniforms = {
      canvasSize: gl.getUniformLocation(program, "u_canvasSize"),
      displayVideoSize: gl.getUniformLocation(program, "u_displayVideoSize"),
      flipY: gl.getUniformLocation(program, "u_flipY"),
      texture: gl.getUniformLocation(program, "u_texture"),
    };

    this.positionLocation = gl.getAttribLocation(program, "a_position");
    if (this.positionLocation === -1) {
      throw new Error("Failed to locate position attribute.");
    }
    gl.enableVertexAttribArray(this.positionLocation);
  }

  /**
   * Create vertex buffer for fullscreen quad
   * Defines two triangles that cover the entire screen (-1 to 1 in both axes).
   */
  private createBuffers() {
    const gl = this.gl;
    if (!gl) return;

    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error("Failed to create WebGL buffer.");
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // Two triangles forming a fullscreen quad
    // Coordinates range from -1 to 1 (normalized device coordinates)
    const positions = new Float32Array([
      -1, -1,  // Bottom-left
      1, -1,   // Bottom-right
      -1, 1,   // Top-left
      -1, 1,   // Top-left (duplicate for second triangle)
      1, -1,   // Bottom-right (duplicate)
      1, 1,    // Top-right
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    this.positionBuffer = buffer;

    if (this.positionLocation !== null) {
      this.bindPositionBuffer(this.positionLocation);
    }
  }

  /**
   * Create WebGL texture for video frames
   * Sets up texture parameters for linear filtering and edge clamping.
   */
  private createTexture() {
    const gl = this.gl;
    if (!gl) return;

    const texture = gl.createTexture();
    if (!texture) {
      throw new Error("Failed to create WebGL texture.");
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.texture = texture;
  }

  /**
   * Bind position buffer and set up vertex attribute
   * Configures how vertex data is read from the buffer.
   */
  private bindPositionBuffer(positionLocation: number) {
    const gl = this.gl;
    if (!gl || !this.positionBuffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  }

  /**
   * Compile a WebGL shader from source code
   * @param type - Shader type (VERTEX_SHADER or FRAGMENT_SHADER)
   * @param source - Shader source code as string
   * @returns Compiled shader or null on failure
   */
  private compileShader(type: number, source: string) {
    const gl = this.gl;
    if (!gl) return null;

    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader) ?? "Unknown error";
      gl.deleteShader(shader);
      throw new Error(`Shader compile failure: ${info}`);
    }

    return shader;
  }

  /**
   * Select appropriate video based on viewport orientation
   * Chooses landscape or portrait video based on aspect ratio.
   * Prepares video for WebGL rendering.
   * Optimizes preload strategy - only loads the active video fully.
   */
  private async selectVideo() {
    const { landscape, portrait } = this.videos;
    if (!landscape && !portrait) return;

    // Determine which video to use based on viewport aspect ratio
    const viewportRatio = window.innerWidth / window.innerHeight || 1;
    const useLandscape = viewportRatio >= 1;
    const target = useLandscape ? landscape : portrait;
    const inactive = useLandscape ? portrait : landscape;

    if (!target) {
      this.enableFallbackVideo();
      return;
    }

    // Skip if already using this video
    if (this.activeVideo === target) return;

    // Switch videos
    this.pauseVideo(this.activeVideo);
    
    // Reset metadata flag when switching videos
    this.videoMetadataLoaded = false;
    
    // Optimize preload: active video gets full preload, inactive gets metadata only
    if (target) {
      target.preload = "auto";
      target.load();
    }
    if (inactive) {
      inactive.preload = "metadata";
    }

    this.activeVideo = target;

    await this.ensureVideoReady(target);
    
    // Only try to play if user has interacted (browser autoplay policy)
    // If not, wait for user interaction
    if (this.hasUserInteracted) {
      await this.playVideo(target);
    } else {
      // Try to play anyway - might work in some browsers
      // If it fails, user interaction handler will retry
      this.playVideo(target).catch(() => {
        // Expected to fail - will be handled by user interaction
      });
    }

    // Remove fallback class (used when WebGL is unavailable)
    target.classList.remove("bg-video-fallback");
    if (landscape && landscape !== target) landscape.classList.remove("bg-video-fallback");
    if (portrait && portrait !== target) portrait.classList.remove("bg-video-fallback");

    // Mark texture for upload on next frame
    this.needsTextureUpload = true;
    this.resize(true);
  }

  /**
   * Enable fallback video mode (when WebGL is unavailable)
   * Uses standard HTML5 video with CSS styling instead of WebGL rendering.
   */
  private enableFallbackVideo() {
    const { landscape, portrait } = this.videos;
    const viewportRatio = window.innerWidth / window.innerHeight || 1;
    const useLandscape = viewportRatio >= 1;
    const primary = useLandscape ? landscape : portrait;
    const secondary = useLandscape ? portrait : landscape;

    if (primary) {
      primary.classList.add("bg-video-fallback");
      void this.playVideo(primary);
    }
    if (secondary) {
      secondary.classList.remove("bg-video-fallback");
      this.pauseVideo(secondary);
    }
  }

  /**
   * Resize WebGL canvas to match display size
   * Accounts for device pixel ratio for high-DPI displays.
   * @param force - Force resize even if dimensions haven't changed
   */
  private resize(force = false) {
    const gl = this.gl;
    if (!gl) return;

    // Account for device pixel ratio (retina displays)
    const dpr = window.devicePixelRatio || 1;
    const width = Math.round(this.canvas.clientWidth * dpr);
    const height = Math.round(this.canvas.clientHeight * dpr);

    if (force || this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    // Update viewport and uniforms
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.updateUniforms();
  }

  /**
   * Update shader uniforms with current canvas and video dimensions
   * Calculates scaling factors for tiling based on video and canvas sizes.
   * Uses "contain" approach to ensure video is never cropped.
   */
  private updateUniforms() {
    if (!this.gl || !this.program || !this.activeVideo || !this.uniforms.canvasSize) return;

    const gl = this.gl;
    
    // CRITICAL: Ensure program is active before setting uniforms
    // Safari is strict about this and will throw INVALID_OPERATION if program isn't active
    gl.useProgram(this.program);
    
    const videoWidth = this.activeVideo.videoWidth || 1;
    const videoHeight = this.activeVideo.videoHeight || 1;

    const canvasSize = [this.canvas.width, this.canvas.height] as const;
    
    // Calculate scale to contain video within canvas (like CSS object-fit: contain)
    // This ensures the video is never cropped - it will fit entirely within the viewport
    // On tall viewports: scale is limited by width (videoWidth * scale = canvasWidth)
    // On wide viewports: scale is limited by height (videoHeight * scale = canvasHeight)
    const widthScale = canvasSize[0] / videoWidth;
    const heightScale = canvasSize[1] / videoHeight;
    const scale = Math.min(widthScale, heightScale);
    
    // Apply padding as a percentage of canvas size
    // e.g., 0.02 = 2% padding (1% on each side)
    const paddingPercent = 0.05; // % padding - adjust this value as needed
    
    // Calculate padding in canvas pixels (percentage of each dimension)
    const paddingWidth = canvasSize[0] * paddingPercent * 2; 
    const paddingHeight = canvasSize[1] * paddingPercent * 2;
    
    // Reduce effective canvas size by padding
    const effectiveCanvasSize: [number, number] = [
      canvasSize[0] - paddingWidth,
      canvasSize[1] - paddingHeight
    ];
    
    // Recalculate scale with reduced canvas size
    const effectiveWidthScale = effectiveCanvasSize[0] / videoWidth;
    const effectiveHeightScale = effectiveCanvasSize[1] / videoHeight;
    const effectiveScale = Math.min(effectiveWidthScale, effectiveHeightScale);
    
    const displayVideoSize = [videoWidth * effectiveScale, videoHeight * effectiveScale];

    gl.uniform2fv(this.uniforms.canvasSize, canvasSize);
    gl.uniform2fv(this.uniforms.displayVideoSize, displayVideoSize);
    gl.uniform1f(this.uniforms.flipY, 1.0);
    gl.uniform1i(this.uniforms.texture, 0);
  }

  /**
   * Main render loop
   * Called every frame via requestAnimationFrame.
   * Uploads video frames to texture and renders tiled pattern.
   */
  private renderFrame = () => {
    const gl = this.gl;

    // Wait for WebGL, program, and video to be ready
    if (!gl || !this.program || !this.activeVideo) {
      this.animationHandle = requestAnimationFrame(this.renderFrame);
      return;
    }

    // Ensure program is active before any WebGL operations
    gl.useProgram(this.program);

    // Clear canvas to black
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Bind video texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // Upload new video frame to texture if needed
    // Only uploads when video has a new frame or forced by needsTextureUpload flag
    // Also uploads if metadata is loaded (for Safari first frame display)
    if (this.needsTextureUpload || this.videoHasNewFrame()) {
      // Only upload if video has valid dimensions (Safari requirement)
      if (this.activeVideo.videoWidth > 0 && this.activeVideo.videoHeight > 0) {
        this.needsTextureUpload = false;
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          this.activeVideo
        );
      }
    }

    // Update uniforms and draw
    this.updateUniforms();
    
    // Ensure position buffer is bound before drawing
    if (this.positionLocation !== null && this.positionBuffer) {
      this.bindPositionBuffer(this.positionLocation);
    }
    
    // Draw 6 vertices (2 triangles forming fullscreen quad)
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Schedule next frame
    this.animationHandle = requestAnimationFrame(this.renderFrame);
  };

  /**
   * Check if video has a new frame available
   * @returns true if video is playing and has new frame data, or if metadata is loaded (for first frame display)
   */
  private videoHasNewFrame() {
    if (!this.activeVideo) return false;
    // Return true if video is playing, OR if metadata is loaded (for Safari first frame)
    // Safari needs this to show the first frame even when video is paused
    return (!this.activeVideo.paused && !this.activeVideo.ended) || 
           (this.videoMetadataLoaded && this.activeVideo.readyState >= 2);
  }

  /**
   * Ensure video is loaded and ready
   * Waits for video metadata to be available before proceeding.
   * @param video - Video element to prepare
   * @returns Promise that resolves when video is ready
   */
  private ensureVideoReady(video: HTMLVideoElement) {
    return new Promise<void>((resolve) => {
      // readyState >= 2 means we have metadata (dimensions available)
      if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
        this.videoMetadataLoaded = true;
        // Force texture upload to show first frame in Safari
        this.needsTextureUpload = true;
        resolve();
        return;
      }

      const hasSources = video.querySelectorAll("source").length > 0 || video.src;
      if (!hasSources) {
        console.warn("Video has no sources, cannot load");
        resolve(); // Resolve anyway to prevent hanging
        return;
      }

      const onLoaded = () => {
        if (video.videoWidth && video.videoHeight) {
          this.videoMetadataLoaded = true;
          // Force texture upload to show first frame in Safari
          this.needsTextureUpload = true;
          video.removeEventListener("loadeddata", onLoaded);
          video.removeEventListener("loadedmetadata", onLoaded);
          video.removeEventListener("canplay", onLoaded);
          resolve();
        }
      };

      video.addEventListener("loadeddata", onLoaded, { once: true });
      video.addEventListener("loadedmetadata", onLoaded, { once: true });
      video.addEventListener("canplay", onLoaded, { once: true });

      video.load();
    });
  }

  /**
   * Play video element
   * Handles autoplay restrictions gracefully.
   * @param video - Video element to play
   */
  private async playVideo(video: HTMLVideoElement | null) {
    if (!video) return;
    
    video.loop = true;
    
    try {
      await video.play();
    } catch (error) {
      console.warn("Video autoplay prevented:", error);
    }
  }

  /**
   * Pause video element
   * @param video - Video element to pause
   */
  private pauseVideo(video: HTMLVideoElement | null) {
    if (!video || video.paused) return;
    video.pause();
  }
}

/**
 * VideoTiledBackground Component
 * 
 * React component that renders a tiled video background using WebGL.
 * Automatically selects landscape or portrait video based on viewport.
 * Falls back to standard HTML5 video if WebGL is unavailable.
 * 
 * Uses two video elements (landscape and portrait) and a canvas for WebGL rendering.
 * Performance optimizations:
 * - Only preloads the active video fully
 * - Lazy loads video sources based on initial viewport
 * - Supports mobile-specific video files
 * - Intelligent codec selection: AV1 (best) > VP9 (good) > H.264 (universal)
 * - Automatically detects browser support and uses optimal format
 * - Reduces bandwidth by 30-60% for modern browsers
 */
export default function VideoTiledBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landscapeRef = useRef<HTMLVideoElement | null>(null);
  const portraitRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Determine initial video sources based on viewport
    // This prevents loading both videos immediately
    const viewportRatio = typeof window !== "undefined" 
      ? window.innerWidth / window.innerHeight || 1 
      : 1;
    const useLandscape = viewportRatio >= 1;
    
    // Set initial video sources - only load what's needed
    const desktopVideo = VIDEO_PATHS.desktop;
    const mobileVideo = VIDEO_PATHS.mobile || desktopVideo; // Fallback to desktop if no mobile video
    
    // Set sources for landscape video (WebM first for better compression, MP4 as fallback)
    if (landscapeRef.current) {
      setVideoSources(landscapeRef.current, desktopVideo);
      // Only preload landscape if it's the initial orientation
      landscapeRef.current.preload = useLandscape ? "auto" : "metadata";
      if (useLandscape) {
        landscapeRef.current.load();
      }
    }
    
    // Set sources for portrait video
    if (portraitRef.current) {
      setVideoSources(portraitRef.current, mobileVideo);
      // Only preload portrait if it's the initial orientation
      portraitRef.current.preload = useLandscape ? "metadata" : "auto";
      if (!useLandscape) {
        portraitRef.current.load();
      }
    }

    // Create controller instance
    const controller = new VideoTiledBackgroundController({
      canvas,
      videos: {
        landscape: landscapeRef.current,
        portrait: portraitRef.current,
      },
    });

    // Initialize controller (sets up WebGL or falls back to video)
    controller.initialize().catch((error) => {
      console.error("Video background initialization failed:", error);
    });

    // Cleanup on unmount
    return () => {
      controller.dispose();
    };
  }, []);

  return (
    <>
      {/* WebGL canvas for tiled video rendering */}
      <canvas ref={canvasRef} id="gl-background" aria-hidden="true" />
      {/* Landscape orientation video (hidden by default, shown when WebGL unavailable) */}
      <video
        ref={landscapeRef}
        className="bg-video"
        muted
        loop
        playsInline
        preload="metadata"
      />
      {/* Portrait orientation video (hidden by default, shown when WebGL unavailable) */}
      <video
        ref={portraitRef}
        className="bg-video"
        muted
        loop
        playsInline
        preload="metadata"
      />
    </>
  );
}
