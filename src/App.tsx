function App() {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <h1 className="text-7xl font-bold text-snow-white mb-2 pulse" style={{
        textShadow: '0 0 20px #DC143C, 0 0 40px #DC143C, 0 0 60px #FFD700',
        letterSpacing: '8px'
      }}>
        JULSPELET
      </h1>
      <p className="text-4xl mb-8" style={{
        textShadow: '0 0 15px #87CEEB',
      }}>
        ❄️ ⛄ 🎄
      </p>
      <p className="text-2xl text-christmas-gold mb-4">
        Vite + TypeScript + React Setup Complete! 🎉
      </p>
      <div className="text-lg text-ice-light mt-8 space-y-2">
        <p>✅ Vite configured</p>
        <p>✅ TypeScript strict mode enabled</p>
        <p>✅ Tailwind CSS ready (winter theme!)</p>
        <p>✅ Vitest configured</p>
        <p>✅ MediaPipe installed</p>
        <p>✅ Project structure created</p>
      </div>
      <div className="mt-12 text-sm text-winter-silver">
        <p>Phase 1: Foundation & Project Setup - <span className="text-christmas-green font-bold">COMPLETE</span></p>
        <p className="mt-2">Ready to start Phase 2: Core Types & Data Structures</p>
      </div>
    </div>
  );
}

export default App;
