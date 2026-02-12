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

  // --- Double Hand Check (Admin) ---
  if (results.landmarks.length === 2) {
      const hand1 = results.landmarks[0];
      const hand2 = results.landmarks[1];
      
      const isHand1Fist = !isExtended(hand1, 8, 6) && !isExtended(hand1, 12, 10) && !isExtended(hand1, 16, 14) && !isExtended(hand1, 20, 18);
      const isHand2Fist = !isExtended(hand2, 8, 6) && !isExtended(hand2, 12, 10) && !isExtended(hand2, 16, 14) && !isExtended(hand2, 20, 18);

      if (isHand1Fist && isHand2Fist) {
          // Both hands are fists -> DOUBLE_FIST
          // Return center of first hand for potential UI usage, though typically unused for Admin trigger
          return { 
              gesture: 'DOUBLE_FIST',
              handCenter: { x: hand1[9].x, y: hand1[9].y },
              indexTip: { x: hand1[8].x, y: hand1[8].y },
              handScale: getDistance(hand1[0], hand1[9])
          };
      }
  }

  // --- Single Hand Logic ---
  const landmarks = results.landmarks[0];
  const gestureData = results.gestures[0][0];
  const category = gestureData.categoryName;
  const score = gestureData.score;

  if (score < 0.3) return { gesture: 'NONE' }; 

  // --- Finger States (Orientation Independent) ---
  const indexExt = isExtended(landmarks, 8, 6);
  const middleExt = isExtended(landmarks, 12, 10);
  const ringExt = isExtended(landmarks, 16, 14);
  const pinkyExt = isExtended(landmarks, 20, 18);
  const thumbExt = isExtended(landmarks, 4, 2); 

  // Additional Thumb Check
  const thumbTipY = landmarks[4].y;
  const thumbIPY = landmarks[3].y;
  const isThumbPointingDown = thumbTipY > thumbIPY;

  let gesture = 'NONE';

  // 1. FIST (Select) - All fingers curled
  // This replaces PINCH for selection
  if (!indexExt && !middleExt && !ringExt && !pinkyExt) {
      // Check thumb? Usually Fist implies thumb is also tucked or on side.
      // We'll relax thumb requirement for Fist to avoid flakiness
      gesture = 'FIST';
  }

  // 2. ROCK (Switch Layout)
  // Index & Pinky Extended, Middle & Ring Curled (🤘)
  else if (indexExt && !middleExt && !ringExt && pinkyExt) {
      gesture = 'ROCK';
  }

  // 3. THUMB_DOWN (Exit - Legacy/Alternative)
  // Keep as fallback or secondary exit? Protocol says "Wave" is exit.
  // But maybe keep Thumb Down as a explicit "Bad/Close" gesture just in case.
  else if (thumbExt && isThumbPointingDown && !indexExt && !middleExt && !ringExt && !pinkyExt) {
      gesture = 'THUMB_DOWN';
  }

  // 4. OPEN_PALM (Navigate / Omni-Joystick)
  // All fingers extended
  else if (indexExt && middleExt && ringExt && pinkyExt) {
       gesture = 'OPEN_PALM';
  }
  
  // Fallback to MediaPipe category
  if (gesture === 'NONE' && score > 0.6) {
      if (category === 'Open_Palm') gesture = 'OPEN_PALM';
      if (category === 'Thumb_Down') gesture = 'THUMB_DOWN';
      if (category === 'Closed_Fist') gesture = 'FIST';
  }

  // --- Coordinate Extraction ---
  const handCenter = { x: landmarks[9].x, y: landmarks[9].y };
  const indexTip = { x: landmarks[8].x, y: landmarks[8].y };
  const handScale = getDistance(landmarks[0], landmarks[9]);

  return { 
      gesture, 
      handCenter,
      indexTip,
      handScale
  };
};
