import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';

let gestureRecognizer = null;

export const initializeGestureRecognizer = async () => {
  if (gestureRecognizer) return;
  try {
    const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
    );
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
        modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
        delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2
    });
  } catch (error) {
      // console.error("Failed to initialize gesture recognizer:", error); // Suppress log
  }
};

export const predictWebcam = (video) => {
  if (!gestureRecognizer || !video) return null;
  const nowInMs = Date.now();
  if (video.currentTime !== undefined && video.currentTime > 0) {
      return gestureRecognizer.recognizeForVideo(video, nowInMs);
  }
  return null;
};

// --- Advanced Geometry Helpers ---

const getDistance = (p1, p2) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
};

// Returns true if finger is extended (Tip is farther from Wrist than PIP is)
// Orientation invariant
const isExtended = (landmarks, tipIdx, pipIdx) => {
    const wrist = landmarks[0];
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    
    return getDistance(tip, wrist) > getDistance(pip, wrist) + 0.02; // Small threshold
};

// Returns true if finger is curled (Tip is closer to Wrist than PIP is)
const isCurled = (landmarks, tipIdx, pipIdx) => {
    const wrist = landmarks[0];
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    
    return getDistance(tip, wrist) < getDistance(pip, wrist); 
};

export const interpretGesture = (results) => {
  if (!results || !results.gestures.length) return { gesture: 'NONE' };

  const landmarks = results.landmarks[0];
  const gestureData = results.gestures[0][0];
  const category = gestureData.categoryName;
  const score = gestureData.score;

  if (score < 0.3) return { gesture: 'NONE' }; // Lower threshold slightly

  // --- Finger States (Orientation Independent) ---
  const indexExt = isExtended(landmarks, 8, 6);
  const middleExt = isExtended(landmarks, 12, 10);
  const ringExt = isExtended(landmarks, 16, 14);
  const pinkyExt = isExtended(landmarks, 20, 18);
  const thumbExt = isExtended(landmarks, 4, 2); // Check Thumb Tip vs MCP

  // Additional Thumb Check: Angle/Direction
  // 4: Tip, 3: IP, 2: MCP, 1: CMC, 0: Wrist
  // For Thumb Up/Down, we care about Y direction relative to IP
  const thumbTipY = landmarks[4].y;
  const thumbIPY = landmarks[3].y;
  const isThumbPointingUp = thumbTipY < thumbIPY; // Screen Y: Up is smaller
  const isThumbPointingDown = thumbTipY > thumbIPY;

  let gesture = 'NONE';

  // 1. PINCH (Click) - REPLACES VICTORY
  // Thumb & Index Tips Close (Pinch), others Curled (Crab Pincer style)
  // This distinguishes it from OK (which has others Extended)
  const pinchDist = getDistance(landmarks[4], landmarks[8]);
  if (pinchDist < 0.05 && !middleExt && !ringExt && !pinkyExt) {
      gesture = 'PINCH';
  }

  // 2. ROCK (Switch Layout)
  // Index & Pinky Extended, Middle & Ring Curled (🤘)
  else if (indexExt && !middleExt && !ringExt && pinkyExt) {
      gesture = 'ROCK';
  }

  // 3. THUMB_DOWN (Exit)
  // Thumb Extended & Pointing DOWN, Others Curled
  else if (thumbExt && isThumbPointingDown && !indexExt && !middleExt && !ringExt && !pinkyExt) {
      gesture = 'THUMB_DOWN';
  }

  // 4. OK (Admin)
  // Thumb & Index Tips Close, Middle/Ring/Pinky Extended
  else if (middleExt && ringExt && pinkyExt) {
      const dist = getDistance(landmarks[4], landmarks[8]); 
      if (dist < 0.05) {
          gesture = 'OK';
      }
  }

  // 5. POINT (Rotate) - Index Extended, others Curled
  else if (indexExt && !middleExt && !ringExt && !pinkyExt) {
      gesture = 'POINT';
  }

  // 6. OPEN_PALM (Zoom)
  // All fingers extended
  else if (indexExt && middleExt && ringExt && pinkyExt) {
       gesture = 'OPEN_PALM';
  }
  
  // Fallback to MediaPipe category if geometry is ambiguous but category is strong
  if (gesture === 'NONE' && score > 0.6) {
      if (category === 'Open_Palm') gesture = 'OPEN_PALM';
      if (category === 'Pointing_Up') gesture = 'POINT';
      if (category === 'Thumb_Down') gesture = 'THUMB_DOWN';
      // Victory removed fallback
  }

  // --- Coordinate Extraction ---
  const handCenter = { x: landmarks[9].x, y: landmarks[9].y };
  const indexTip = { x: landmarks[8].x, y: landmarks[8].y };
  
  // Calculate Hand Scale (Distance between Wrist(0) and Middle MCP(9))
  // This is a stable metric for "Hand Distance"
  const handScale = getDistance(landmarks[0], landmarks[9]);

  return { 
      gesture, 
      handCenter,
      indexTip,
      handScale
  };
};
