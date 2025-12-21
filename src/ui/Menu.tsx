interface MenuProps {
  isLoading: boolean;
  loadingText: string;
  onStart: () => void;
}

export function Menu({ isLoading, loadingText, onStart }: MenuProps) {
  return (
    <div className="text-center">
      <div className="text-6xl mb-4">🎄</div>
      <h1
        className="text-7xl font-bold mb-2"
        style={{
          textShadow: "0 0 20px #e74c3c, 0 0 40px #c0392b",
          letterSpacing: "8px",
          color: "#ffffff",
        }}
      >
        JULSPELET
      </h1>
      <p className="text-3xl mt-4 text-red-400">
        🎅 Hoppa och ducka dig genom vinterlandet! 🎅
      </p>
      <div className="mt-8 text-lg text-sky-300 space-y-3">
        <p className="text-2xl">❄️ Hoppa över snöhögar - hoppa på riktigt!</p>
        <p className="text-2xl">🎁 Ducka under presenter - böj dig ner!</p>
        <p className="text-xl mt-4 text-emerald-400">
          Upp till 2 spelare kan vara med!
        </p>
      </div>
      {isLoading && (
        <p className="mt-5 text-sky-300 animate-pulse">
          <span className="text-2xl">⏳</span> {loadingText}
        </p>
      )}
      <button
        onClick={onStart}
        disabled={isLoading}
        className="mt-10 px-24 py-10 text-5xl font-bold text-white border-4 border-red-500 rounded-2xl disabled:bg-gray-600 disabled:cursor-not-allowed transition-all hover:scale-105 min-w-[500px] min-h-[150px]"
        style={{
          background: isLoading
            ? "#333"
            : "linear-gradient(45deg, #2b55c0ff, #787fe4ff)",
          boxShadow: isLoading
            ? "none"
            : "0 0 30px #3c64e7ff, 0 0 60px #912bc0ff",
        }}
      >
        {isLoading ? "⏳ VÄNTAR..." : "🎮 STARTA! 🎮"}
      </button>
      <p className="mt-6 text-sm text-sky-200 opacity-70">
        Ställ dig framför kameran så du syns ordentligt!
      </p>
    </div>
  );
}
