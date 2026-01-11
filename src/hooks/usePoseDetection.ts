import { useState, useRef, useCallback, useEffect, MutableRefObject, RefObject } from 'react';
import { MediaPipePoseDetector } from '@/pose/MediaPipePoseDetector';
import { LandmarkProcessor } from '@/pose/LandmarkProcessor';
import { CalibrationService } from '@/pose/CalibrationService';
import { GestureDetector } from '@/pose/GestureDetector';
import { GameEngine } from '@/game/GameEngine';

interface UsePoseDetectionOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  engineRef: MutableRefObject<GameEngine>;
  onGesture: (playerId: number, gesture: { shouldJump: boolean; isDucking: boolean }) => void;
}

export function usePoseDetection({
  videoRef,
  engineRef,
  onGesture,
}: UsePoseDetectionOptions) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  const detectorRef = useRef<MediaPipePoseDetector | null>(null);
  const processorsRef = useRef<Map<number, LandmarkProcessor>>(new Map());
  const calibrationRef = useRef<Map<number, CalibrationService>>(new Map());
  const gestureRef = useRef<Map<number, GestureDetector>>(new Map());
  const onGestureRef = useRef(onGesture);

  useEffect(() => { onGestureRef.current = onGesture; }, [onGesture]);

  const initialize = useCallback(async () => {
    detectorRef.current = new MediaPipePoseDetector({ numPoses: 2 });
    await detectorRef.current.initialize();
    setIsInitialized(true);
  }, []);

  const startDetection = useCallback(() => {
    const videoElement = videoRef.current;
    if (!detectorRef.current || !videoElement) return;

    detectorRef.current.start(videoElement, (result) => {
      if (result.poses.length === 0) return;

      // Get CURRENT state from engine ref on every frame
      const engine = engineRef.current;
      const currentPlayers = engine.getPlayers();
      const currentState = engine.getState();
      const isCalibrating = currentState === 'calibrating';
      const isPlaying = currentState === 'playing';

      if (currentPlayers.length === 0) {
        console.warn('No players in game - pose detected but no player to assign it to');
        return;
      }

      const sortedPoses = [...result.poses].sort((a, b) => {
        const hipXA = (a[23].x + a[24].x) / 2;
        const hipXB = (b[23].x + b[24].x) / 2;
        return hipXA - hipXB;
      });

      for (let i = 0; i < Math.min(sortedPoses.length, currentPlayers.length); i++) {
        const player = currentPlayers[i];
        const landmarks = sortedPoses[i];

        if (!processorsRef.current.has(player.id)) {
          processorsRef.current.set(player.id, new LandmarkProcessor());
        }
        const processor = processorsRef.current.get(player.id)!;
        const smoothed = processor.process(landmarks);
        player.landmarks = landmarks;
        player.smoothedLandmarks = smoothed;

        if (isCalibrating) {
          if (!calibrationRef.current.has(player.id)) {
            calibrationRef.current.set(player.id, new CalibrationService({
              maxVariance: 1.0, // Very forgiving - almost always succeeds
              calibrationFrames: 30, // 1 second at 30fps
            }));
          }
          const calibration = calibrationRef.current.get(player.id)!;
          const complete = calibration.addFrame(landmarks);
          const progress = calibration.getProgress();
          setCalibrationProgress(progress);
          console.log(`Calibration progress: ${(progress * 100).toFixed(0)}%, samples: ${calibration.getSampleCount()}`);

          if (complete) {
            const res = calibration.finalize();
            console.log('Calibration finalize result:', res);
            if (res.success && res.data) {
              player.calibration = res.data;
              console.log(`Player ${player.id} calibrated successfully!`);
            } else {
              console.warn(`Player ${player.id} calibration failed:`, res.error, '- retrying...');
              calibration.reset();
              setCalibrationProgress(0);
            }
          }
        } else if (isPlaying && player.calibration.isCalibrated) {
          if (!gestureRef.current.has(player.id)) {
            gestureRef.current.set(player.id, new GestureDetector());
          }
          const detector = gestureRef.current.get(player.id)!;
          const gesture = detector.detect(landmarks, player.calibration, player.physics);
          onGestureRef.current(player.id, gesture);
        }
      }

      if (isCalibrating) {
        const allCalibrated = currentPlayers.every(p => p.calibration.isCalibrated);

        if (allCalibrated && currentPlayers.length > 0) {
          console.log('All players calibrated! Starting countdown...');
          engine.completeCalibration();
        }
      }
    });
  }, [videoRef, engineRef]);

  const stopDetection = useCallback(() => { detectorRef.current?.stop(); }, []);

  const reset = useCallback(() => {
    processorsRef.current.clear();
    calibrationRef.current.clear();
    gestureRef.current.clear();
    setCalibrationProgress(0);
  }, []);

  useEffect(() => () => { detectorRef.current?.dispose(); }, []);

  return { isInitialized, calibrationProgress, initialize, startDetection, stopDetection, reset };
}
