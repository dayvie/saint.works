"use client";

import { useEffect, useRef } from "react";

type VideoElements = {
  landscape: HTMLVideoElement | null;
  portrait: HTMLVideoElement | null;
};

type ControllerOptions = {
  canvas: HTMLCanvasElement;
  videos: VideoElements;
};

class VideoTiledBackgroundController {
  private canvas: HTMLCanvasElement;
  private videos: VideoElements;
  private gl: WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;
  private positionLocation: number | null = null;
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
  private activeVideo: HTMLVideoElement | null = null;
  private needsTextureUpload = false;
  private animationHandle: number | null = null;
  private mediaQuery: MediaQueryList | null = null;
  private handleResize: () => void;
  private handleOrientation: () => void;

  constructor({ canvas, videos }: ControllerOptions) {
    this.canvas = canvas;
    this.videos = videos;
    this.gl = this.canvas.getContext("webgl", { alpha: false, antialias: true });
    this.mediaQuery = typeof window !== "undefined"
      ? window.matchMedia("(orientation: portrait)")
      : null;

    this.prepareVideos();

    this.handleResize = () => {
      if (this.gl) {
        this.resize();
        void this.selectVideo();
      } else {
        this.enableFallbackVideo();
      }
    };

    this.handleOrientation = () => {
      if (this.gl) {
        void this.selectVideo();
      } else {
        this.enableFallbackVideo();
      }
    };
  }

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

    this.disposeGL();
    this.pauseVideo(this.activeVideo);
  }

  private prepareVideos() {
    Object.values(this.videos).forEach((video) => {
      if (!video) return;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
    });
  }

  private attachEvents() {
    window.addEventListener("resize", this.handleResize);
    if (this.mediaQuery) {
      if (typeof this.mediaQuery.addEventListener === "function") {
        this.mediaQuery.addEventListener("change", this.handleOrientation);
      } else if (typeof this.mediaQuery.addListener === "function") {
        this.mediaQuery.addListener(this.handleOrientation);
      }
    }
  }

  private async initGL() {
    this.createProgram();
    this.createBuffers();
    this.createTexture();
    await this.selectVideo();
    this.resize(true);
    this.renderFrame();
  }

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

  private createProgram() {
    const gl = this.gl;
    if (!gl) return;

    const vertexSrc = `
      attribute vec2 a_position;
      varying vec2 v_uv;

      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentSrc = `
      precision mediump float;

      uniform sampler2D u_texture;
      uniform vec2 u_canvasSize;
      uniform vec2 u_displayVideoSize;
      uniform float u_flipY;
      varying vec2 v_uv;

      void main() {
        vec2 offset = (v_uv - 0.5) * u_canvasSize / u_displayVideoSize;
        vec2 scaled = offset + 0.5;
        vec2 tileIndex = floor(scaled);
        vec2 localCoord = scaled - tileIndex;
        vec2 videoUV = localCoord;
        videoUV.y = (u_flipY > 0.5) ? 1.0 - videoUV.y : videoUV.y;
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

  private createBuffers() {
    const gl = this.gl;
    if (!gl) return;

    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error("Failed to create WebGL buffer.");
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const positions = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    this.positionBuffer = buffer;

    if (this.positionLocation !== null) {
      this.bindPositionBuffer(this.positionLocation);
    }
  }

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

  private bindPositionBuffer(positionLocation: number) {
    const gl = this.gl;
    if (!gl || !this.positionBuffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  }

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

  private async selectVideo() {
    const { landscape, portrait } = this.videos;
    if (!landscape && !portrait) return;

    const viewportRatio = window.innerWidth / window.innerHeight || 1;
    const useLandscape = viewportRatio >= 1;
    const target = useLandscape ? landscape : portrait;

    if (!target) {
      this.enableFallbackVideo();
      return;
    }

    if (this.activeVideo === target) return;

    this.pauseVideo(this.activeVideo);
    this.activeVideo = target;

    await this.ensureVideoReady(target);
    await this.playVideo(target);

    target.classList.remove("bg-video-fallback");
    if (landscape && landscape !== target) landscape.classList.remove("bg-video-fallback");
    if (portrait && portrait !== target) portrait.classList.remove("bg-video-fallback");

    this.needsTextureUpload = true;
    this.resize(true);
  }

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

  private resize(force = false) {
    const gl = this.gl;
    if (!gl) return;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.round(this.canvas.clientWidth * dpr);
    const height = Math.round(this.canvas.clientHeight * dpr);

    if (force || this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.updateUniforms();
  }

  private updateUniforms() {
    if (!this.gl || !this.activeVideo || !this.uniforms.canvasSize) return;

    const gl = this.gl;
    const videoWidth = this.activeVideo.videoWidth || 1;
    const videoHeight = this.activeVideo.videoHeight || 1;

    const canvasSize = [this.canvas.width, this.canvas.height] as const;
    const coverScale = Math.max(canvasSize[0] / videoWidth, canvasSize[1] / videoHeight);
    
    // Better mobile detection: check for touch capability or mobile user agent
    const hasTouch = 
      'ontouchstart' in window ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    const isMobile = hasTouch || isMobileUA || window.innerWidth <= 640;
    
    const widthLimitScale = isMobile 
      ? canvasSize[0] / videoWidth 
      : (canvasSize[0] * 0.75) / videoWidth;
    const scale = Math.min(coverScale, widthLimitScale > 0 ? widthLimitScale : coverScale);
    const displayVideoSize = [videoWidth * scale, videoHeight * scale];

    gl.uniform2fv(this.uniforms.canvasSize, canvasSize);
    gl.uniform2fv(this.uniforms.displayVideoSize, displayVideoSize);
    gl.uniform1f(this.uniforms.flipY, 1.0);
    gl.uniform1i(this.uniforms.texture, 0);
  }

  private renderFrame = () => {
    const gl = this.gl;

    if (!gl || !this.program || !this.activeVideo) {
      this.animationHandle = requestAnimationFrame(this.renderFrame);
      return;
    }

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    if (this.needsTextureUpload || this.videoHasNewFrame()) {
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

    this.updateUniforms();
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    this.animationHandle = requestAnimationFrame(this.renderFrame);
  };

  private videoHasNewFrame() {
    if (!this.activeVideo) return false;
    return !this.activeVideo.paused && !this.activeVideo.ended;
  }

  private ensureVideoReady(video: HTMLVideoElement) {
    return new Promise<void>((resolve) => {
      if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
        resolve();
        return;
      }

      const onLoaded = () => {
        video.removeEventListener("loadeddata", onLoaded);
        resolve();
      };

      video.addEventListener("loadeddata", onLoaded, { once: true });
      video.load();
    });
  }

  private async playVideo(video: HTMLVideoElement | null) {
    if (!video) return;
    try {
      await video.play();
    } catch (error) {
      console.warn("Video autoplay prevented:", error);
    }
  }

  private pauseVideo(video: HTMLVideoElement | null) {
    if (!video || video.paused) return;
    video.pause();
  }
}

export default function VideoTiledBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landscapeRef = useRef<HTMLVideoElement | null>(null);
  const portraitRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const controller = new VideoTiledBackgroundController({
      canvas,
      videos: {
        landscape: landscapeRef.current,
        portrait: portraitRef.current,
      },
    });

    controller.initialize().catch((error) => {
      console.error("Video background initialization failed:", error);
    });

    return () => {
      controller.dispose();
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} id="gl-background" aria-hidden="true" />
      <video
        ref={landscapeRef}
        className="bg-video"
        src="/desktop-bg.mp4"
        muted
        loop
        playsInline
        preload="auto"
      />
      <video
        ref={portraitRef}
        className="bg-video"
        src="/desktop-bg.mp4"
        muted
        loop
        playsInline
        preload="auto"
      />
    </>
  );
}
