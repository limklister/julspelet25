interface GameOverProps {
  score: number;
  isNewRecord: boolean;
  onRestart: () => void;
}

export function GameOver({ score, isNewRecord, onRestart }: GameOverProps) {
  return (
    <div className="text-center">
      <div className="text-5xl mb-4">❄️</div>
      <h1
        className="text-7xl font-bold mb-6"
        style={{
          color: "#87ceeb",
          textShadow: "0 0 20px #87ceeb, 0 0 40px #1e90ff",
        }}
      >
        SLUT FÖR IDAG!
      </h1>
      <p className="text-5xl text-white mb-4">⭐ POÄNG: {score} ⭐</p>
      {isNewRecord && (
        <p
          className="text-3xl mb-6 animate-pulse"
          style={{
            color: "#ffd700",
            textShadow: "0 0 15px #ffd700",
          }}
        >
          🎉 NYTT REKORD! 🎉
        </p>
      )}
      <div className="text-4xl my-4">🎄🎁🎄</div>
      <button
        onClick={onRestart}
        className="mt-6 px-24 py-10 text-5xl font-bold text-white border-4 border-red-500 rounded-2xl transition-all hover:scale-105 min-w-[500px] min-h-[150px]"
        style={{
          background: "linear-gradient(45deg, #84bdf2ff, #3c5ee7ff)",
          boxShadow: "0 0 30px #412bc0ff, 0 0 60px #3c5ee7ff",
        }}
      >
        🎮 FÖRSÖK IGEN! 🎮
      </button>
      <p className="mt-4 text-sky-300 text-lg">
        Klicka för att hoppa tillbaka i snön!
      </p>
    </div>
  );
}
