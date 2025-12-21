interface GameOverProps {
  score: number;
  isNewRecord: boolean;
  onRestart: () => void;
}

export function GameOver({ score, isNewRecord, onRestart }: GameOverProps) {
  return (
    <div className="text-center">
      <h1 className="text-7xl font-bold mb-8" style={{
        color: '#ff0066',
        textShadow: '0 0 20px #ff0066, 0 0 40px #ff0066',
      }}>
        GAME OVER
      </h1>
      <p className="text-5xl text-green-400 mb-4">SCORE: {score}</p>
      {isNewRecord && (
        <p className="text-3xl mb-8 animate-pulse" style={{
          color: '#ff8800',
          textShadow: '0 0 15px #ff8800',
        }}>
          NYTT REKORD!
        </p>
      )}
      <button
        onClick={onRestart}
        className="mt-8 px-16 py-5 text-3xl font-bold text-white border-4 border-green-400"
        style={{
          background: 'linear-gradient(45deg, #ff4500, #ff6b00)',
          boxShadow: '0 0 20px #ff4500, 0 0 40px #ff4500',
        }}
      >
        SPELA IGEN
      </button>
    </div>
  );
}
