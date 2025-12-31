"use client";

import { useState, useEffect } from "react";
import VideoTiledBackground from "../components/VideoTiledBackground";
import BottomBar from "../components/BottomBar";

export default function HomePage() {
  const [isBottomBarExpanded, setIsBottomBarExpanded] = useState(false);
  const [isGlBackgroundHovered, setIsGlBackgroundHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile/touch devices
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error - for older browsers
        (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0);
      
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      
      const isSmallScreen = window.innerWidth <= 750;
      
      setIsMobile(hasTouch || isMobileUA || isSmallScreen);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    window.addEventListener("orientationchange", checkMobile);
    
    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("orientationchange", checkMobile);
    };
  }, []);

  useEffect(() => {
    const glBackground = document.querySelectorAll("#gl-background, main.overlay");
    if (!glBackground || glBackground.length === 0) return;

    // Only attach hover handlers on desktop (non-touch devices)
    const handleMouseEnter = () => {
      if (!isMobile && isBottomBarExpanded) {
        setIsGlBackgroundHovered(true);
      }
    };

    const handleMouseLeave = () => {
      if (!isMobile) {
        setIsGlBackgroundHovered(false);
      }
    };

    // Click/touch handler works on both mobile and desktop
    const handleClick = (e: Event) => {
      if (isBottomBarExpanded) {
        setIsBottomBarExpanded(false);
        setIsGlBackgroundHovered(false);
      }
    };

    for (const element of Array.from(glBackground)) {
      // Only attach hover events on desktop
      if (!isMobile) {
        element.addEventListener("mouseenter", handleMouseEnter);
        element.addEventListener("mouseleave", handleMouseLeave);
      }
      // Click/touch works on both
      element.addEventListener("click", handleClick);
      element.addEventListener("touchend", handleClick);
    }

    return () => {
      for (const element of Array.from(glBackground)) {
        if (!isMobile) {
          element.removeEventListener("mouseenter", handleMouseEnter);
          element.removeEventListener("mouseleave", handleMouseLeave);
        }
        element.removeEventListener("click", handleClick);
        element.removeEventListener("touchend", handleClick);
      }
    };
  }, [isBottomBarExpanded, isMobile]);

  return (
    <div className="page">
      <div className="page-content-wrapper">
        <VideoTiledBackground />
        <main 
          className="overlay" 
          role="main"
        >
        </main>
      </div>
      <BottomBar 
        isExpanded={isBottomBarExpanded} 
        setIsExpanded={setIsBottomBarExpanded}
        isGlBackgroundHovered={isGlBackgroundHovered}
      />
    </div>
  );
}
