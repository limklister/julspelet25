import { useState, useRef, useEffect, useCallback } from 'react';
import { GameEngine } from '@/game/GameEngine';
import { GameCanvas } from '@/ui/GameCanvas';
import { Menu } from '@/ui/Menu';
import { GameOver } from '@/ui/GameOver';
import { useCamera } from '@/hooks/useCamera';
import { usePoseDetection } from '@/hooks/usePoseDetection';

function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameOver'>('menu');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Laddar AI-modell...');
  const [finalScore, setFinalScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const engineRef = useRef<GameEngine>(new GameEngine());
  const camera = useCamera();

  const handleGesture = useCallback((playerId: number, gesture: { shouldJump: boolean; isDucking: boolean }) => {
    if (gesture.shouldJump) {
      engineRef.current.applyJump(playerId);
    }
    const player = engineRef.current.getPlayers().find(p => p.id === playerId);
    if (player) {
      player.physics.isDucking = gesture.isDucking;
    }
  }, []);

  const pose = usePoseDetection({
    videoRef: camera.videoRef,
    engineRef: engineRef,
    onGesture: handleGesture,
  });

  useEffect(() => {
    const init = async () => {
      setLoadingText('Laddar AI-modell...');
      await pose.initialize();
      setLoadingText('Startar kamera...');
      await camera.initialize();
      setLoadingText('Redo!');
      setIsLoading(false);
    };
    init();
    return () => camera.stop();
  }, []);

  const handleStart = useCallback(() => {
    engineRef.current = new GameEngine();
    engineRef.current.startGame();
    engineRef.current.addPlayer();
    pose.reset();
    pose.startDetection();
    setGameState('playing');
  }, [pose]);

  const handleGameOver = useCallback(() => {
    pose.stopDetection();
    setFinalScore(engineRef.current.getScore());
    setIsNewRecord(engineRef.current.getScore() >= engineRef.current.getHighScore() && engineRef.current.getScore() > 0);
    setGameState('gameOver');
  }, [pose]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-sky-950 to-slate-800 flex flex-col items-center justify-center font-mono">
      <video ref={camera.videoRef} className="hidden" width={640} height={480} autoPlay playsInline />
      {gameState === 'menu' && <Menu isLoading={isLoading} loadingText={loadingText} onStart={handleStart} />}
      {gameState === 'playing' && <GameCanvas engine={engineRef.current} onGameOver={handleGameOver} />}
      {gameState === 'gameOver' && <GameOver score={finalScore} isNewRecord={isNewRecord} onRestart={handleStart} />}
    </div>
  );
}

export default App;
