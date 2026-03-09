# Project Memory: JiQi-World

## 1. Project Overview
- **Description**: A 3D immersive gallery controlled by AI hand gestures (PC) and Device Orientation (Mobile).
- **Style**: Cyberpunk, HUD, Dark Mode.
- **Status**: Completed.

## 2. Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS.
- **3D Engine**: Three.js, @react-three/fiber, @react-three/drei.
- **AI/Vision**: MediaPipe Tasks Vision (GestureRecognizer), TensorFlow.js.
- **Motion**: Framer Motion.
- **Backend**: Supabase (PostgreSQL + Storage).
- **Audio**: Web Audio API (Procedural Sound Generation).

## 3. Key Technical Assets (Reusable Modules)

### A. AI Gesture Control System (`GestureHandler.jsx` & `gestureLogic.js`)
- **Core Logic**: Hybrid recognition combining MediaPipe classification with custom geometric heuristics (finger extension checks).
- **Features**:
  - **Omni-Joystick**: Virtual joystick based on hand position relative to screen center with deadzone handling.
  - **Charge-to-Trigger**: Time-based gesture holding (visualized by SVG ring) to prevent accidental clicks.
  - **Wave Detection**: Velocity-based gesture detection using a history buffer of hand positions (independent of static gesture classification).
  - **Stability**: Frame-based debouncing (`gestureCountRef`) to filter jitter.

### B. Mobile Gyroscope Experience (`Mobile3DScene.jsx`)
- **Core Logic**: `DeviceOrientationControls` for camera movement.
- **Features**:
  - **Permission Handling**: Compatible with iOS 13+ permission request flow.
  - **Dynamic Transitions**: Smooth linear interpolation (`lerp`) for moving photos from sphere layout to focused view without re-rendering components.
  - **Optimization**: Direct Three.js object manipulation in `useFrame` loop for 60FPS performance.

### C. Procedural Sound Engine (`SoundManager.js`)
- **Core Logic**: Web Audio API `OscillatorNode` & `GainNode`.
- **Features**: Zero-dependency sound generation (Sine/Triangle waves) for UI interactions (Hover, Click, Success), ensuring low latency and small bundle size.

## 4. Architecture & Design Decisions
- **Zero GC Goal**: Minimized object creation in render loops (`useFrame`, `useInterval`) to prevent frame drops.
- **Responsive Strategy**: 
  - Desktop: Full 3D + Webcam + AI.
  - Mobile: 2D List + Optional 3D Gyro View (Hardware capability check).
- **Visuals**: HUD overlays with `pointer-events-none` to allow 3D interaction underneath.

## 5. Development Protocols (User Preferences)
- **Documentation**: User-facing docs MUST be in Chinese.
- **Communication**: Clarify requirements before coding. No assumptions.
- **Stack**: Prefer React 19, functional components, and Tailwind CSS.
