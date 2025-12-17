"use client";

import { useState } from "react";
import VideoTiledBackground from "../components/VideoTiledBackground";
import BottomBar from "../components/BottomBar";

export default function HomePage() {
  const [isBottomBarExpanded, setIsBottomBarExpanded] = useState(false);

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
      />
    </div>
  );
}
