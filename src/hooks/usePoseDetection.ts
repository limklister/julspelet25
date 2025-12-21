import { useState, useRef, useCallback, useEffect } from 'react';
import { MediaPipePoseDetector } from '@/pose/MediaPipePoseDetector';
import { LandmarkProcessor } from '@/pose/LandmarkProcessor';
import { CalibrationService } from '@/pose/CalibrationService';
import { GestureDetector } from '@/pose/GestureDetector';
import { Player } from '@/core/types';

interface UsePoseDetectionOptions {
  videoElement: HTMLVideoElement | null;
  players: Player[];
  isCalibrating: boolean;
  isPlaying: boolean;
  onCalibrationComplete: () => void;
  onGesture: (playerId: number, gesture: { shouldJump: boolean; isDucking: boolean }) => void;
}

export function usePoseDetection({
  videoElement, players, isCalibrating, isPlaying,
  onCalibrationComplete, onGesture,
}: UsePoseDetectionOptions) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  const detectorRef = useRef<MediaPipePoseDetector | null>(null);
  const processorsRef = useRef<Map<number, LandmarkProcessor>>(new Map());
  const calibrationRef = useRef<Map<number, CalibrationService>>(new Map());
  const gestureRef = useRef<Map<number, GestureDetector>>(new Map());

  const initialize = useCallback(async () => {
    detectorRef.current = new MediaPipePoseDetector({ numPoses: 2 });
    await detectorRef.current.initialize();
    setIsInitialized(true);
  }, []);

  const startDetection = useCallback(() => {
    if (!detectorRef.current || !videoElement) return;

    detectorRef.current.start(videoElement, (result) => {
      if (result.poses.length === 0) return;

      const sortedPoses = [...result.poses].sort((a, b) => {
        const hipXA = (a[23].x + a[24].x) / 2;
        const hipXB = (b[23].x + b[24].x) / 2;
        return hipXA - hipXB;
      });

      for (let i = 0; i < Math.min(sortedPoses.length, players.length); i++) {
        const player = players[i];
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
            calibrationRef.current.set(player.id, new CalibrationService());
          }
          const calibration = calibrationRef.current.get(player.id)!;
          const complete = calibration.addFrame(landmarks);
          setCalibrationProgress(calibration.getProgress());
          if (complete) {
            const res = calibration.finalize();
            if (res.success && res.data) player.calibration = res.data;
          }
        } else if (isPlaying && player.calibration.isCalibrated) {
          if (!gestureRef.current.has(player.id)) {
            gestureRef.current.set(player.id, new GestureDetector());
          }
          const detector = gestureRef.current.get(player.id)!;
          const gesture = detector.detect(landmarks, player.calibration, player.physics);
          onGesture(player.id, gesture);
        }
      }

      if (isCalibrating) {
        const allCalibrated = players.every(p => p.calibration.isCalibrated);
        if (allCalibrated && players.length > 0) onCalibrationComplete();
      }
    });
  }, [videoElement, players, isCalibrating, isPlaying, onCalibrationComplete, onGesture]);

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
