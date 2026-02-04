import React, { useEffect, useRef, useState } from 'react';
import { initializeGestureRecognizer, predictWebcam, interpretGesture } from '../utils/gestureLogic';
import { useInterval } from 'react-use';

const GESTURE_MAP = {
    'NONE': '等待手势...',
    'POINT': '👆 指向旋转',
    'VICTORY': '✌️ 点击确认',
    'THUMB_DOWN': '👎 退出返回',
    'OPEN_PALM': '🖐 前后缩放',
    'ROCK': '🤘 切换布局',
    'OK': '👌 管理员模式'
};

export default function GestureHandler({ onGesture, onCursorMove, onRotate, onZoom, onAdminTrigger }) {
  const videoRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [currentGesture, setCurrentGesture] = useState('NONE');
  const [error, setError] = useState(null);
  
  // Smoothing Refs
  const lastCursorRef = useRef({ x: 0.5, y: 0.5 });
  const lastRotateRef = useRef({ x: 0.5, y: 0.5 });
  const lastZoomScaleRef = useRef(0.15); // Default scale approx

  // Logic Refs
  const lastGestureRef = useRef('NONE');
  const gestureCountRef = useRef(0);
  const hasTriggeredRef = useRef(false); // For one-shot gestures
  const okHoldTimeRef = useRef(0);

  useEffect(() => {
    const init = async () => {
      await initializeGestureRecognizer();
      setLoaded(true);
    };
    init();
    
    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setError(null);
        } catch (err) {
            console.error("Webcam error:", err);
            setError("未检测到摄像头，手势功能已禁用");
        }
    };
    startWebcam();

    return () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
    };
  }, []);

  // Lerp Helper
  const lerp = (start, end, factor) => start + (end - start) * factor;

  useInterval(() => {
      if (loaded && videoRef.current && videoRef.current.readyState >= 2) {
          const results = predictWebcam(videoRef.current);
          const { gesture: rawGesture, handCenter, indexTip, handScale } = interpretGesture(results);
          
          // --- 1. Continuous Tracking (Always active based on gesture) ---
          
          // A. POINT -> Rotate (Look Around) + Cursor Move (Visual)
          if (rawGesture === 'POINT') {
              // Smooth Rotate Coords - INCREASED SENSITIVITY (0.1 -> 0.2)
              const targetX = 1 - indexTip.x;
              const targetY = indexTip.y;
              
              lastRotateRef.current.x = lerp(lastRotateRef.current.x, targetX, 0.2); 
              lastRotateRef.current.y = lerp(lastRotateRef.current.y, targetY, 0.2);
              
              onRotate(lastRotateRef.current);
              
              // Also update cursor for visual feedback
              onCursorMove(lastRotateRef.current);
          } else {
              onRotate(null); // Stop rotating if not pointing
              
              // B. PINCH -> LOCK CURSOR (Don't update position)
              if (rawGesture === 'PINCH') {
                   // DO NOTHING to lastRotateRef/lastCursorRef
                   // This effectively "locks" the cursor where it was last frame
                   // No onCursorMove call means visual cursor stays put
              } else {
                  // For other gestures (like NONE), we might want to hide cursor?
                  // App.jsx handles hiding if gesture is NONE.
              }
          }
          
          // Reset Rotation if not POINT
          // Handled above in else block

          // C. OPEN_PALM -> Zoom (Using Hand Scale)
          if (rawGesture === 'OPEN_PALM' && handScale) {
              // Smooth Scale
              lastZoomScaleRef.current = lerp(lastZoomScaleRef.current, handScale, 0.1);
              onZoom(lastZoomScaleRef.current);
          } else {
              onZoom(null); 
          }


          // --- 2. Discrete Gesture Detection (Debounced) ---
          
          if (rawGesture === lastGestureRef.current) {
              gestureCountRef.current += 1;
          } else {
              lastGestureRef.current = rawGesture;
              gestureCountRef.current = 0;
          }

          // Require 2 frames stability
          if (gestureCountRef.current >= 2) {
              const stableGesture = rawGesture;
              
              if (stableGesture !== currentGesture) {
                  setCurrentGesture(stableGesture);
                  // Notify generic change
                  onGesture(stableGesture);
                  
                  // Reset one-shot trigger when gesture changes
                  if (stableGesture === 'NONE' || stableGesture === 'POINT') {
                      hasTriggeredRef.current = false;
                      okHoldTimeRef.current = 0;
                  }
              }

              // --- One-Shot Triggers ---
              
              // PINCH (Click)
              if (stableGesture === 'PINCH' && !hasTriggeredRef.current) {
                  onGesture('VICTORY_TRIGGER'); // Keep legacy event name or rename? Keeping for now.
                  hasTriggeredRef.current = true;
              }

              // ROCK (Switch Layout)
              if (stableGesture === 'ROCK' && !hasTriggeredRef.current) {
                  onGesture('LAYOUT_TRIGGER');
                  hasTriggeredRef.current = true;
              }

              // THUMB_DOWN (Exit)
              if (stableGesture === 'THUMB_DOWN' && !hasTriggeredRef.current) {
                  onGesture('THUMB_DOWN_TRIGGER');
                  hasTriggeredRef.current = true;
              }

              // OK (Admin) - Hold for 3 seconds (Increased from 2s)
              if (stableGesture === 'OK') {
                  okHoldTimeRef.current += 50; // Add 50ms
                  if (okHoldTimeRef.current > 3000 && !hasTriggeredRef.current) {
                      onAdminTrigger();
                      hasTriggeredRef.current = true;
                  }
              } else {
                  okHoldTimeRef.current = 0;
              }
          }
      }
  }, 50);

  return (
    <div className="fixed top-4 right-4 z-40 pointer-events-none flex flex-col items-end gap-2">
      <video 
        ref={videoRef} 
        className="fixed top-0 left-0 w-64 h-48 object-cover opacity-0 pointer-events-none -z-50" 
        autoPlay 
        playsInline 
        muted
      ></video>
      
      <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-white/90 text-sm font-light shadow-lg transition-all duration-300 flex items-center gap-2">
          {error ? (
             <span className="text-red-400">{error}</span>
          ) : (
             <>
                <span className="mr-2 opacity-50">Gesture:</span>
                <span className="text-cyan-400 font-medium">{GESTURE_MAP[currentGesture] || currentGesture}</span>
                {currentGesture === 'OK' && !hasTriggeredRef.current && (
                    <span className="text-xs text-yellow-400 ml-2">Hold...</span>
                )}
             </>
          )}
      </div>
    </div>
  );
}
