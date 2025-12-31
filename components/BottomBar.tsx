"use client";

import { useEffect, useState, useRef } from "react";
import { getAssetPath } from "../lib/constants";

function getLondonTime(): string {
  const now = new Date();
  const londonTime = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Europe/London",
    })
  );
  return londonTime.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

interface BottomBarProps {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  isGlBackgroundHovered?: boolean;
}

export default function BottomBar({ isExpanded, setIsExpanded, isGlBackgroundHovered = false }: BottomBarProps) {
  const [londonTime, setLondonTime] = useState(getLondonTime());
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const lastHoverTimeRef = useRef<number>(0);

  useEffect(() => {
    const checkMobile = () => {
      // Check for touch capability (primary mobile indicator)
      const hasTouch = 
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error - for older browsers
        (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0);
      
      // Check user agent for mobile devices
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      
      // Fallback: check screen size for small devices without touch
      const isSmallScreen = window.innerWidth <= 750;
      
      // Mobile if: has touch capability OR mobile user agent OR small screen
      setIsMobile(hasTouch || isMobileUA || isSmallScreen);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    // Also listen for touch capability changes
    window.addEventListener("orientationchange", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("orientationchange", checkMobile);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLondonTime(getLondonTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleHeaderClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    // On mobile, if hover just fired (within 300ms), ignore the click to prevent double-trigger
    // This shouldn't happen on mobile since we disable hover, but keeping as safety
    const timeSinceHover = Date.now() - lastHoverTimeRef.current;
    if (isMobile && timeSinceHover < 300) {
      return;
    }
    // Only open if closed, do nothing if already open
    if (!isExpanded) {
      setIsExpanded(true);
      setIsHovered(false);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    // Only handle hover on desktop (non-touch devices)
    if (isMobile) return;
    e.stopPropagation(); // Prevent page hover from collapsing
    lastHoverTimeRef.current = Date.now();
    // On desktop, show hover state (85px) if not fully expanded
    if (!isExpanded) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    // Only handle hover on desktop (non-touch devices)
    if (isMobile) return;
    e.stopPropagation(); // Prevent page hover from interfering
    if (!isExpanded) {
      setIsHovered(false);
    }
  };

  return (
    <div
      className={`bottom-bar ${isExpanded ? "expanded" : ""} ${isHovered ? "hovered" : ""} ${isGlBackgroundHovered ? "hover-close" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleHeaderClick}
      onTouchStart={handleHeaderClick}
    >
      <div className="bottom-bar-header" >
        <div className={"bottom-bar-arrow-container " + (isExpanded ? "hidden" : "")}>
          <div className="bottom-bar-arrow-icon">
            <div className="icon"></div>
          </div>
        </div>
      </div>

      <div 
        className="bottom-bar-body"
        onClick={(e) => e.stopPropagation()}
      >
          <div className="bottom-bar-body-content">
            {/* Desktop Layout */}
            <div className="bottom-bar-desktop">
              <div className="flex">
                <div className="bottom-bar-section info">
                  <p>© 2025 Saint.Works LTD<br />All Rights Reserved</p>
                </div>

                <div className="bottom-bar-section links">
                  <div className="bottom-bar-links">
                    <a href="https://linkedin.com/saint.works" target="_blank" rel="noopener noreferrer">
                      Linkedin
                    </a>
                    <a href="mailto:hello@saint.works">Contact</a>
                    <a href="https://instagram.com/saint.works" target="_blank" rel="noopener noreferrer">
                      Instagram
                    </a>
                  </div>
                </div>

                <div className="bottom-bar-section content">
                    <p>Saint.Works is the design practice of Creative Director Matt Saint.</p>
                    <p>With experience building brands, shaping campaigns, and leading teams for some of the world&apos;s most exciting companies, Matt brings a strategic and idea-led approach to every project.</p>
                    <p>Saint.Works collaborates with a trusted network of designers, animators, strategists and producers, bringing together the right talent to create purposeful, impactful work.</p>
                    <p><a href="mailto:hello@saint.works">Get in touch.</a></p>
                </div>

                <div className="bottom-bar-section location">
                  <p>East London<br />United Kingdom</p>
                </div>
              </div>

              <div className="bottom-bar-section full-width">
                <img 
                  src={getAssetPath("img/sw-desk.svg")} 
                  alt="Saint.Works Logo" 
                />
              </div>

            </div>


            {/* Mobile Layout */}
            <div className="bottom-bar-mobile">
              <div className="bottom-bar-section info">
                <p>© 2025 Saint.<br />Works LTD All Rights Reserved</p>
              </div>

              <div className="bottom-bar-section content">
                  <p>Saint.Works is the design practice of Creative Director Matt Saint.</p>
                  <p>With experience building brands, shaping campaigns, and leading teams for some of the world&apos;s most exciting companies, Matt brings a strategic and idea-led approach to every project.</p>
                  <p>Saint.Works collaborates with a trusted network of designers, animators, strategists and producers, bringing together the right talent to create purposeful, impactful work.</p>
                  <p><a href="mailto:hello@saint.works">Get in touch.</a></p>
              </div>

              <div className="bottom-bar-section bottom-bar-links-grid">
                <div className="bottom-bar-links-grid-item">
                  <a href="https://linkedin.com/saint.works" target="_blank" rel="noopener noreferrer">
                    Linkedin
                  </a>
                </div>
                <div className="bottom-bar-links-grid-item">
                  <a href="mailto:hello@saint.works">Contact</a>
                </div>
                <div className="bottom-bar-links-grid-item">
                  <a href="https://instagram.com/saint.works" target="_blank" rel="noopener noreferrer">
                    Instagram
                  </a>
                </div>
                <div className="bottom-bar-links-grid-item">
                  <div>London</div>
                </div>
              </div>

              <div className="bottom-bar-section full-width">
                <img 
                  src={getAssetPath("img/sw-mob.svg")} 
                  alt="Saint.Works Logo"
                />
              </div>

            </div>
          </div>
        </div>
    </div>
  );
}

