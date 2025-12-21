interface MenuProps {
  isLoading: boolean;
  loadingText: string;
  onStart: () => void;
}

export function Menu({ isLoading, loadingText, onStart }: MenuProps) {
  return (
    <div className="text-center">
      <h1 className="text-7xl font-bold mb-2" style={{
        textShadow: '0 0 20px #ff4500, 0 0 40px #ff4500',
        letterSpacing: '8px',
        color: '#00ff88',
      }}>
        JULSPELET
      </h1>
      <p className="text-2xl mt-8 text-orange-500">Styrs med Pose Detection!</p>
      <div className="mt-10 text-lg text-green-400 space-y-2">
        <p>HOPPA: Hoppa pa riktigt!</p>
        <p>DUCKA: Boj dig ner</p>
        <p>1-2 spelare stods!</p>
      </div>
      {isLoading && <p className="mt-5 text-orange-500">{loadingText}</p>}
      <button
        onClick={onStart}
        disabled={isLoading}
        className="mt-12 px-16 py-5 text-3xl font-bold text-white border-4 border-green-400 disabled:bg-gray-600 disabled:cursor-not-allowed"
        style={{
          background: isLoading ? '#333' : 'linear-gradient(45deg, #ff4500, #ff6b00)',
          boxShadow: isLoading ? 'none' : '0 0 20px #ff4500, 0 0 40px #ff4500',
        }}
      >
        {isLoading ? 'VANTAR...' : 'START'}
      </button>
    </div>
  );
}
