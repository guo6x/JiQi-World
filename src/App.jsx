import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWindowSize } from 'react-use';
import { getMemories } from './supabaseClient';
import { soundManager } from './utils/SoundManager';
import SplashScreen from './components/SplashScreen';
import DesktopView from './components/DesktopView';
import MobileView from './components/MobileView';
import GestureHandler from './components/GestureHandler';
import UploadModal from './components/UploadModal';

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
        cursorPos={cursorPos}
        rotateCoords={rotateCoords}
        zoomY={zoomY}
      />
      
      <GestureHandler 
        onGesture={handleGesture} 
        onCursorMove={handleCursorMove}
        onRotate={handleRotate}
        onZoom={handleZoom}
        onAdminTrigger={() => {
            soundManager.playSuccess();
            setShowUpload(true);
        }}
      />
      
      {/* Virtual Cursor */}
      <div 
        ref={cursorRef}
        className="fixed top-0 left-0 w-8 h-8 pointer-events-none z-[60] -ml-4 -mt-4 opacity-0 transition-opacity duration-300"
      >
        <div className="w-full h-full border-2 border-cyan-400 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.8)] flex items-center justify-center">
            <div className="w-1 h-1 bg-white rounded-full"></div>
        </div>
      </div>

      <div className="absolute top-8 left-8 text-white pointer-events-none z-10">
        <h1 className="text-3xl font-light tracking-widest">吉琪的世界</h1>
        <p className="text-xs text-gray-400 mt-2 tracking-wider">
            MODE: {layoutMode} | {selectedId ? 'DETAIL' : 'WORLD'}
        </p>
        <div className="mt-4 text-[10px] text-gray-600 space-y-1">
            <p>👆 食指: 指向旋转</p>
            <p>✌️ 剪刀手: 点击确认</p>
            <p>👎 拇指向下: 退出</p>
            <p>🖐 张开手掌: 前后缩放</p>
            <p>🤘 摇滚手势: 切换布局</p>
        </div>
      </div>

      {selectedId && (() => {
          const mem = memories.find(m => m.id === selectedId);
          if (!mem) return null;
          return (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center z-20 pointer-events-none max-w-lg w-full px-4">
                  <h2 className="text-2xl font-light text-white mb-2 tracking-widest">{mem.memory_date}</h2>
                  <p className="text-lg text-cyan-200 font-light leading-relaxed drop-shadow-lg">{mem.description}</p>
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
