import React, { useEffect, useRef, useState } from 'react';
import { initializeGestureRecognizer, predictWebcam, interpretGesture } from '../utils/gestureLogic';
import { useInterval } from 'react-use';

const GESTURE_MAP = {
    'NONE': '等待手势...',
    'OPEN_PALM': '🖐 全向浏览',
    'FIST': '✊ 蓄力选中',
    'ROCK': '🤘 切换布局',
    'THUMB_DOWN': '👎 退出',
    // 'DOUBLE_FIST': 'Hidden', // Don't show text
};

// Colors for Charge Ring
const RING_COLORS = {
    'FIST': '#22d3ee',      // Cyan (Select)
    'ROCK': '#a855f7',      // Purple (Transform)
    'DOUBLE_FIST': '#ef4444' // Red (Admin)
};

const MAX_HOLD_TIME = {
    'FIST': 1000,
    'ROCK': 1500,
    'DOUBLE_FIST': 2000
};

export default function GestureHandler({ onGesture, onRotate, onAdminTrigger, onWave, onZoom }) {
  const videoRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [currentGesture, setCurrentGesture] = useState('NONE');
  const [error, setError] = useState(null);
  
  // Logic Refs
  const lastGestureRef = useRef('NONE');
  const gestureCountRef = useRef(0);
  const hasTriggeredRef = useRef(false); 
  const holdTimeRef = useRef(0);
  const [chargeProgress, setChargeProgress] = useState(0);
  const lastZoomScaleRef = useRef(0.15); // Default scale approx

  // Omni-Joystick Logic
  const [joystickVector, setJoystickVector] = useState({ x: 0, y: 0 }); // -1 to 1

  // Wave Logic
  const handHistoryRef = useRef([]); // Stores last 5 x-positions
  const lastWaveTimeRef = useRef(0);

  // Lerp Helper
  const lerp = (start, end, factor) => start + (end - start) * factor;

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

  useInterval(() => {
      if (loaded && videoRef.current && videoRef.current.readyState >= 2) {
          const results = predictWebcam(videoRef.current);
          const { gesture: rawGesture, handCenter, handScale } = interpretGesture(results);
          
          // --- 1. Discrete Gesture Stability (Debounce) ---
          if (rawGesture === lastGestureRef.current) {
              gestureCountRef.current += 1;
          } else {
              lastGestureRef.current = rawGesture;
              gestureCountRef.current = 0;
          }

          // Stable Gesture Decision
          let stableGesture = currentGesture;
          if (gestureCountRef.current >= 2) {
              stableGesture = rawGesture;
              if (stableGesture !== currentGesture) {
                  setCurrentGesture(stableGesture);
                  onGesture(stableGesture); // Notify App
                  
                  // Reset Triggers on Change
                  hasTriggeredRef.current = false;
                  holdTimeRef.current = 0;
                  setChargeProgress(0);
              }
          }

          // --- 2. Logic Per Gesture ---
          
          // --- B. WAVE DETECTION (Exit) ---
          // Run independently of gesture state to catch quick motions
          if (handCenter && Date.now() - lastWaveTimeRef.current > 1000) { 
               handHistoryRef.current.push({ x: handCenter.x, time: Date.now() });
               if (handHistoryRef.current.length > 8) handHistoryRef.current.shift(); // Increase buffer

               // Check recent movement (last ~200ms)
               if (handHistoryRef.current.length >= 3) {
                   const latest = handHistoryRef.current[handHistoryRef.current.length-1];
                   
                   // Find a point roughly 200ms ago
                   let prev = handHistoryRef.current[0];
                   for (let i = handHistoryRef.current.length - 2; i >= 0; i--) {
                       if (latest.time - handHistoryRef.current[i].time > 100) {
                           prev = handHistoryRef.current[i];
                           break;
                       }
                   }

                   const dx = latest.x - prev.x;
                   const dt = latest.time - prev.time;
                   
                   if (dt > 50) {
                       const velocity = dx / dt; // units/ms
                       
                       // Trigger if velocity is high enough (0.0012)
                       if (Math.abs(velocity) > 0.0012) { 
                            console.log("Wave Triggered!", velocity);
                            onWave(); // Trigger Exit
                            lastWaveTimeRef.current = Date.now();
                            handHistoryRef.current = [];
                       }
                   }
               }
          } else if (!handCenter) {
               handHistoryRef.current = [];
          }

          // A. OMNI-JOYSTICK (Navigate) & ZOOM
          // Always allow zoom if hand is present and Open Palm, even if not perfectly stable?
          // No, stick to stableGesture to avoid jitter.
          if (stableGesture === 'OPEN_PALM' && handCenter) {
              // --- ZOOM LOGIC ---
              // Debug Zoom
              // console.log("Hand Scale:", handScale);
              
              if (handScale) {
                  // Smooth Scale
                  lastZoomScaleRef.current = lerp(lastZoomScaleRef.current, handScale, 0.1);
                  if (onZoom) {
                      onZoom(lastZoomScaleRef.current);
                  }
              }

              // --- JOYSTICK LOGIC ---
              // Center is 0.5, 0.5
              const rawDx = handCenter.x - 0.5; 
              const rawDy = handCenter.y - 0.5;

              // Deadzone Check (15% = 0.15 radius)
              const dist = Math.sqrt(rawDx*rawDx + rawDy*rawDy);
              
              if (dist > 0.1) {
                  // Normalize Thrust (0 to 1 outside deadzone)
                  const thrust = Math.min((dist - 0.1) / 0.35, 1); 
                  
                  // Direction Vector
                  const dirX = rawDx / dist;
                  const dirY = rawDy / dist;

                  // Update UI Vector
                  setJoystickVector({ x: dirX * thrust, y: dirY * thrust });

                  // Send to DesktopView
                  onRotate({ 
                      x: 0.5 - (dirX * thrust * 0.5), 
                      y: 0.5 + (dirY * thrust * 0.5)
                  });
              } else {
                  setJoystickVector({ x: 0, y: 0 });
                  onRotate(null);
              }
          } else {
              setJoystickVector({ x: 0, y: 0 });
              onRotate(null);
              if (onZoom) onZoom(null);
          }

          // C. CHARGING LOGIC (Select / Transform / Admin)
          const maxTime = MAX_HOLD_TIME[stableGesture];
          if (maxTime && !hasTriggeredRef.current) {
              holdTimeRef.current += 50;
              const progress = Math.min(holdTimeRef.current / maxTime, 1);
              setChargeProgress(progress);

              if (progress >= 1) {
                  hasTriggeredRef.current = true;
                  
                  // Trigger Events
                  if (stableGesture === 'FIST') onGesture('VICTORY_TRIGGER'); // Map Fist to Click
                  if (stableGesture === 'ROCK') onGesture('LAYOUT_TRIGGER');
                  if (stableGesture === 'DOUBLE_FIST') onAdminTrigger();
              }
          } else {
              // Not a charging gesture OR already triggered
              if (!maxTime) setChargeProgress(0);
          }
      }
  }, 50);

  // --- UI RENDER ---
  return (
    <>
        {/* Webcam Preview (Hidden Logic, Visible Feedback) */}
        <div className="fixed top-4 right-4 z-40 pointer-events-none flex flex-col items-end gap-2">
            <video 
                ref={videoRef} 
                className="fixed top-0 left-0 w-64 h-48 object-cover opacity-0 pointer-events-none -z-50" 
                autoPlay 
                playsInline 
                muted
                style={{ transform: 'scaleX(-1)' }} // Mirror
            ></video>
            
            {/* Gesture Status Pill */}
            <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-white/90 text-sm font-light shadow-lg flex items-center gap-3">
                {error ? (
                    <span className="text-red-400">{error}</span>
                ) : (
                    <div className="relative flex items-center justify-center w-6 h-6">
                         {/* Charge Ring SVG */}
                         {chargeProgress > 0 && (
                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                                <circle 
                                    cx="12" cy="12" r="10" 
                                    fill="none" 
                                    stroke={RING_COLORS[currentGesture] || 'white'}
                                    strokeWidth="3"
                                    strokeDasharray={`${chargeProgress * 63} 63`} // 2*PI*r approx 63
                                    className="transition-all duration-75"
                                />
                            </svg>
                         )}
                         <span className="text-lg relative z-10">
                            {currentGesture === 'FIST' && '✊'}
                            {currentGesture === 'DOUBLE_FIST' && '🤜'}
                            {currentGesture === 'ROCK' && '🤘'}
                            {currentGesture === 'OPEN_PALM' && '🖐'}
                            {currentGesture === 'THUMB_DOWN' && '👎'}
                            {currentGesture === 'NONE' && '⏳'}
                         </span>
                    </div>
                )}
                <span className="text-cyan-400 font-medium font-mono">{GESTURE_MAP[currentGesture] || currentGesture}</span>
            </div>
        </div>

        {/* Omni-Joystick Dashboard (Bottom Center) */}
        {currentGesture === 'OPEN_PALM' && !error && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-opacity duration-300 opacity-100">
                <div className="relative w-48 h-24 bg-gradient-to-t from-cyan-900/20 to-transparent border-b border-cyan-500/30 flex items-end justify-center pb-2">
                     {/* Arcs */}
                     <div className="absolute bottom-0 w-full h-full border-b-2 border-cyan-500/20 rounded-full scale-x-150 opacity-30"></div>
                     
                     {/* Thrust Bar */}
                     <div className="flex gap-1 items-end h-16">
                         {[...Array(10)].map((_, i) => {
                             const mag = Math.sqrt(joystickVector.x**2 + joystickVector.y**2);
                             const active = (i / 10) < mag;
                             return (
                                 <div 
                                    key={i} 
                                    className={`w-1.5 rounded-t-sm transition-all duration-100 ${active ? 'bg-cyan-400 h-full shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'bg-cyan-900/40 h-1/3'}`}
                                 />
                             );
                         })}
                     </div>

                     {/* Direction Indicator */}
                     <div 
                        className="absolute bottom-[-10px] w-4 h-4 bg-white rounded-full shadow-[0_0_15px_white] transition-transform duration-75"
                        style={{ 
                            transform: `translate(${joystickVector.x * 60}px, ${joystickVector.y * -30}px)` 
                        }}
                     />
                     
                     <div className="absolute -bottom-8 text-[10px] text-cyan-500/60 font-mono tracking-[0.5em]">OMNI-DRIVE</div>
                </div>
            </div>
        )}
    </>
  );
}
