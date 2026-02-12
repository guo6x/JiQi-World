import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWindowSize } from 'react-use';
import { getMemories } from './supabaseClient';
import { soundManager } from './utils/SoundManager';
import SplashScreen from './components/SplashScreen';
import DesktopView from './components/DesktopView';
import MobileView from './components/MobileView';
import GestureHandler from './components/GestureHandler';
import UploadModal from './components/UploadModal';
import { config } from './config';

export default function App() {
  const { width } = useWindowSize();
  const isMobile = width < 768;

  const [showSplash, setShowSplash] = useState(true);
  const [memories, setMemories] = useState([]);
  const [layoutMode, setLayoutMode] = useState('SPHERE'); 
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null); 
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState(null);
  
  // Interaction State
  const [rotationSpeed, setRotationSpeed] = useState(0.05); // Faster default
  const [cursorPos, setCursorPos] = useState(null); // Null when hand not present
  const [rotateCoords, setRotateCoords] = useState(null);
  const [zoomY, setZoomY] = useState(null);

  const cursorRef = useRef(null);

  useEffect(() => {
    getMemories()
      .then(data => {
        setMemories(data);
        setError(null);
      })
      .catch(err => {
        // console.error("Failed to load memories:", err); // Suppress log in production
        setError("无法连接到记忆库，请检查网络连接");
      });
  }, []);

  // --- Handlers ---

  const handleCursorMove = useCallback((pos) => {
      setCursorPos(pos);
      if (cursorRef.current) {
          cursorRef.current.style.transform = `translate(${pos.x * window.innerWidth}px, ${pos.y * window.innerHeight}px)`;
          cursorRef.current.style.opacity = 1;
      }
  }, []);

  const handleRotate = useCallback((coords) => {
      setRotateCoords(coords);
  }, []);

  const handleZoom = useCallback((y) => {
      setZoomY(y);
  }, []);

  const handleGesture = useCallback((gesture) => {
    if (showUpload) return;

    // Reset Cursor visibility if hand lost
    if (gesture === 'NONE') {
        if (cursorRef.current) cursorRef.current.style.opacity = 0;
        setCursorPos(null);
        setRotateCoords(null);
        setZoomY(null);
    }

    // Discrete Events
    switch (gesture) {
      case 'LAYOUT_TRIGGER':
        soundManager.playSwitch();
        setLayoutMode(prev => prev === 'SPHERE' ? 'HELIX' : 'SPHERE');
        break;
      
      case 'VICTORY_TRIGGER': // Click
        if (hoveredId && !selectedId) {
             soundManager.playHover();
             setSelectedId(hoveredId);
        }
        break;

      case 'THUMB_DOWN_TRIGGER': // Exit
        if (selectedId) {
             soundManager.playExit();
             setSelectedId(null);
        }
        break;
        
      default:
        break;
    }
  }, [selectedId, hoveredId, showUpload]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (isMobile) {
    return (
        <div className="bg-black min-h-screen">
            <MobileView 
                memories={memories} 
                onOpenUpload={() => setShowUpload(true)}
            />
            {showUpload && (
                <UploadModal 
                    memories={memories}
                    onClose={() => setShowUpload(false)} 
                    onUploadSuccess={() => {
                        getMemories().then(setMemories);
                    }}
                />
            )}
        </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black font-sans cursor-none"> 
      
      <DesktopView 
        memories={memories} 
        layoutMode={layoutMode} 
        selectedId={selectedId}
        hoveredId={hoveredId}
        onHover={setHoveredId}
        rotationSpeed={rotationSpeed}
        cursorPos={{ x: 0.5, y: 0.5 }} // Always raycast from center (Crosshair selection)
        rotateCoords={rotateCoords}
        zoomY={zoomY}
      />
      
      <GestureHandler 
        onGesture={handleGesture} 
        onRotate={handleRotate}
        onZoom={handleZoom}
        onWave={() => {
            if (selectedId) {
                soundManager.playExit();
                setSelectedId(null);
            }
        }}
        onAdminTrigger={() => {
            soundManager.playSuccess();
            setShowUpload(true);
        }}
      />
      
      {/* Center Crosshair (Reticle) */}
      <div className="fixed top-1/2 left-1/2 w-12 h-12 -ml-6 -mt-6 pointer-events-none z-[60] opacity-30">
        <div className="w-full h-full border border-white/30 rounded-full flex items-center justify-center">
            <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
        </div>
      </div>

      <div className="absolute top-8 left-8 text-white pointer-events-none z-10">
        <h1 className="text-3xl font-light tracking-widest">{config.title}</h1>
        <p className="text-xs text-gray-400 mt-2 tracking-wider">
            MODE: {layoutMode} | {selectedId ? 'DETAIL' : 'WORLD'}
        </p>
        <div className="mt-4 text-[10px] text-gray-600 space-y-1 font-mono">
            <p>🖐 全向浏览 (Omni-Drive)</p>
            <p>✊ 蓄力选中 (Hold to Select)</p>
            <p>👋 挥手退出 (Wave to Close)</p>
            <p>🤘 蓄力变形 (Rock to Shift)</p>
        </div>
      </div>

      {selectedId && (() => {
          const mem = memories.find(m => m.id === selectedId);
          if (!mem) return null;
          return (
              <div className="absolute top-0 right-0 w-1/3 h-full bg-black/40 backdrop-blur-md border-l border-white/10 p-12 flex flex-col justify-center z-20 pointer-events-auto overflow-y-auto">
                  <h2 className="text-4xl font-thin text-white mb-8 tracking-widest">{mem.memory_date}</h2>
                  <div className="w-12 h-1 bg-cyan-500 mb-8"></div>
                  <p className="text-lg text-gray-200 font-light leading-relaxed whitespace-pre-line">
                    {mem.description}
                  </p>
              </div>
          );
      })()}

      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[70] bg-red-500/80 text-white px-6 py-2 rounded-full backdrop-blur-md shadow-lg flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <span>{error}</span>
        </div>
      )}

      {showUpload && (
        <UploadModal 
            memories={memories}
            onClose={() => setShowUpload(false)} 
            onUploadSuccess={() => {
                getMemories().then(setMemories);
            }}
        />
      )}
    </div>
  );
}
