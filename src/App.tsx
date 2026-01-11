import { useState, useRef, useEffect, useCallback } from 'react';
import { GameEngine } from '@/game/GameEngine';
import { GameCanvas } from '@/ui/GameCanvas';
import { Menu } from '@/ui/Menu';
import { GameOver } from '@/ui/GameOver';
import { WinScreen } from '@/ui/WinScreen';
import { useCamera } from '@/hooks/useCamera';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { soundManager } from '@/audio/SoundManager';

function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'win' | 'gameOver'>('menu');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Laddar AI-modell...');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const engineRef = useRef<GameEngine>(new GameEngine({
    canvasWidth: window.innerWidth,
    canvasHeight: window.innerHeight,
    groundLevel: window.innerHeight - 60,
  }));
  const camera = useCamera();

  const handleGesture = useCallback((playerId: number, gesture: { shouldJump: boolean; isDucking: boolean }) => {
    if (gesture.shouldJump) {
      engineRef.current.applyJump(playerId);
      soundManager.play('jump');
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
      try {
        setLoadingText('Laddar AI-modell...');
        await pose.initialize();
        setLoadingText('Startar kamera...');
        await camera.initialize();
        setLoadingText('Redo!');
        setIsLoading(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Okänt fel';
        console.error('Initialization failed:', error);
        setErrorText(message);
        setLoadingText('Fel vid laddning');
      }
    };
    init();
    return () => camera.stop();
  }, []);

  const handleStart = useCallback(() => {
    engineRef.current = new GameEngine({
      canvasWidth: window.innerWidth,
      canvasHeight: window.innerHeight,
      groundLevel: window.innerHeight - 60,
    });
    engineRef.current.startGame();
    engineRef.current.addPlayer();
    pose.reset();
    pose.startDetection();
    setGameState('playing');
  }, [pose]);

  const handleGameOver = useCallback(() => {
    pose.stopDetection();
    const levelState = engineRef.current.getLevelState();
    setFinalScore(levelState.totalPackages);
    setIsNewRecord(engineRef.current.getHighestLevel() >= 5);
    setGameState('gameOver');
  }, [pose]);

  const handleWin = useCallback(() => {
    pose.stopDetection();
    setGameState('win');
  }, [pose]);

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }} className="bg-gradient-to-b from-slate-900 via-sky-950 to-slate-800 flex flex-col items-center justify-center font-mono">
      <video ref={camera.videoRef} className="hidden" width={640} height={480} autoPlay playsInline />
      {gameState === 'menu' && <Menu isLoading={isLoading} loadingText={loadingText} errorText={errorText} onStart={handleStart} />}
      {gameState === 'playing' && (
        <GameCanvas
          engine={engineRef.current}
          onGameOver={handleGameOver}
          onWin={handleWin}
          calibrationProgress={pose.calibrationProgress}
        />
      )}
      {gameState === 'win' && <WinScreen onPlayAgain={handleStart} />}
      {gameState === 'gameOver' && <GameOver score={finalScore} isNewRecord={isNewRecord} onRestart={handleStart} />}
    </div>
  );
}

export default App;
