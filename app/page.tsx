"use client";

import { useState } from "react";
import VideoTiledBackground from "../components/VideoTiledBackground";
import BottomBar from "../components/BottomBar";

export default function HomePage() {
  const [isBottomBarExpanded, setIsBottomBarExpanded] = useState(false);

  const handleVideoAreaHover = () => {
    setIsBottomBarExpanded(false);
  };

  return (
    <div className="page" onMouseEnter={handleVideoAreaHover}>
      <VideoTiledBackground />
      <main 
        className="overlay" 
        role="main"
        onMouseEnter={handleVideoAreaHover}
      >
      </main>
      <BottomBar 
        isExpanded={isBottomBarExpanded} 
        setIsExpanded={setIsBottomBarExpanded}
      />
    </div>
  );
}
