import { useRef, useEffect, useState } from 'react';

interface MenuProps {
  isLoading: boolean;
  loadingText: string;
  errorText?: string | null;
  onStart: () => void;
}

export function Menu({ isLoading, loadingText, errorText, onStart }: MenuProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const [buttonHover, setButtonHover] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Snowflakes
    const snowflakes: { x: number; y: number; size: number; speed: number; wobble: number }[] = [];
    for (let i = 0; i < 100; i++) {
      snowflakes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 4 + 1,
        speed: Math.random() * 1.5 + 0.5,
        wobble: Math.random() * Math.PI * 2,
      });
    }

    const render = () => {
      frameRef.current++;
      const frame = frameRef.current;

      // Background gradient - deeper winter night
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0a0f1a');
      grad.addColorStop(0.3, '#0d1a2d');
      grad.addColorStop(0.6, '#1a3a5c');
      grad.addColorStop(1, '#2d5a87');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Aurora borealis effect
      ctx.globalAlpha = 0.15;
      for (let i = 0; i < 3; i++) {
        const auroraGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
        auroraGrad.addColorStop(0, 'transparent');
        auroraGrad.addColorStop(0.3, '#27ae60');
        auroraGrad.addColorStop(0.5, '#2ecc71');
        auroraGrad.addColorStop(0.7, '#27ae60');
        auroraGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = auroraGrad;
        const waveY = 80 + i * 40 + Math.sin(frame * 0.01 + i) * 20;
        ctx.beginPath();
        ctx.moveTo(0, waveY);
        for (let x = 0; x < canvas.width; x += 20) {
          const y = waveY + Math.sin(x * 0.01 + frame * 0.02 + i) * 30;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, 0);
        ctx.lineTo(0, 0);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Stars - more and brighter
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 60; i++) {
        const x = (i * 41 + frame * 0.02) % canvas.width;
        const y = (i * 31) % (canvas.height * 0.5);
        const twinkle = Math.sin(frame * 0.05 + i * 1.5) * 0.5 + 0.5;
        ctx.globalAlpha = 0.3 + twinkle * 0.7;
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + twinkle * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Falling snow
      ctx.fillStyle = '#ffffff';
      for (const flake of snowflakes) {
        flake.y += flake.speed;
        flake.x += Math.sin(frame * 0.015 + flake.wobble) * 0.5;
        if (flake.y > canvas.height) {
          flake.y = -10;
          flake.x = Math.random() * canvas.width;
        }
        ctx.globalAlpha = 0.6 + flake.size * 0.1;
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Snow ground with gentle hills
      const groundY = canvas.height - 100;
      ctx.fillStyle = '#e8f4f8';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      for (let x = 0; x <= canvas.width; x += 10) {
        const hillY = groundY + Math.sin(x * 0.008) * 20 + Math.sin(x * 0.02) * 10;
        ctx.lineTo(x, hillY);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.fill();

      // Snow sparkles
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 30; i++) {
        const sparkleX = (i * 67 + frame * 0.5) % canvas.width;
        const sparkleY = groundY + 20 + (i * 13) % 60;
        const sparkle = Math.sin(frame * 0.1 + i * 2) * 0.5 + 0.5;
        ctx.globalAlpha = sparkle * 0.8;
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, 1 + sparkle, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Christmas trees
      drawTree(ctx, canvas.width * 0.06, groundY + 10, 0.9);
      drawTree(ctx, canvas.width * 0.14, groundY + 15, 0.6);
      drawTree(ctx, canvas.width * 0.22, groundY + 5, 0.4);
      drawTree(ctx, canvas.width * 0.78, groundY + 5, 0.5);
      drawTree(ctx, canvas.width * 0.86, groundY + 15, 0.7);
      drawTree(ctx, canvas.width * 0.94, groundY + 10, 0.85);

      // Main card
      const cardX = canvas.width / 2;
      const cardY = canvas.height / 2 - 20;
      const cardW = 580;
      const cardH = 380;

      // Card glow
      ctx.shadowBlur = 40;
      ctx.shadowColor = 'rgba(192, 57, 43, 0.4)';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.roundRect(cardX - cardW / 2, cardY - cardH / 2, cardW, cardH, 24);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Card body - rich deep red gradient
      const cardGrad = ctx.createLinearGradient(cardX - cardW / 2, cardY - cardH / 2, cardX + cardW / 2, cardY + cardH / 2);
      cardGrad.addColorStop(0, '#8b1a1a');
      cardGrad.addColorStop(0.5, '#6b1515');
      cardGrad.addColorStop(1, '#4a0f0f');
      ctx.fillStyle = cardGrad;
      ctx.beginPath();
      ctx.roundRect(cardX - cardW / 2, cardY - cardH / 2, cardW, cardH, 24);
      ctx.fill();

      // Card border - gold
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner decorative border
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cardX - cardW / 2 + 12, cardY - cardH / 2 + 12, cardW - 24, cardH - 24, 18);
      ctx.stroke();

      // Corner holly decorations
      drawHolly(ctx, cardX - cardW / 2 + 35, cardY - cardH / 2 + 35, 0.8);
      drawHolly(ctx, cardX + cardW / 2 - 35, cardY - cardH / 2 + 35, 0.8);
      drawHolly(ctx, cardX - cardW / 2 + 35, cardY + cardH / 2 - 35, 0.8);
      drawHolly(ctx, cardX + cardW / 2 - 35, cardY + cardH / 2 - 35, 0.8);

      // Decorative stars around title
      for (let i = 0; i < 7; i++) {
        const starX = cardX - 180 + i * 60;
        const starY = cardY - 130 + Math.sin(frame * 0.04 + i) * 4;
        const starSize = 6 + Math.sin(frame * 0.06 + i * 2) * 2;
        ctx.globalAlpha = 0.7 + Math.sin(frame * 0.05 + i) * 0.3;
        drawStar(ctx, starX, starY, starSize, 5, 0.5, '#d4af37');
      }
      ctx.globalAlpha = 1;

      // Title with elegant styling
      ctx.textAlign = 'center';
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.font = 'bold 72px Georgia, serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Julspelet', cardX, cardY - 80);
      ctx.shadowBlur = 0;

      // Christmas message
      ctx.font = 'italic 28px Georgia, serif';
      ctx.fillStyle = '#f5e6c8';
      ctx.fillText('Nu är det jul igen', cardX, cardY - 20);
      ctx.fillText('och nu är det jul igen', cardX, cardY + 15);

      ctx.font = '24px Georgia, serif';
      ctx.fillStyle = '#e8d4a8';
      ctx.fillText('och julen varar ända till påska...', cardX, cardY + 55);

      // Loading, error, or button area
      if (errorText) {
        // Show error message
        ctx.font = 'bold 20px Georgia, serif';
        ctx.fillStyle = '#e74c3c';

        // Word wrap the error text
        const maxWidth = cardW - 60;
        const words = errorText.split(' ');
        let line = '';
        let y = cardY + 110;

        for (const word of words) {
          const testLine = line + word + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && line !== '') {
            ctx.fillText(line.trim(), cardX, y);
            line = word + ' ';
            y += 28;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line.trim(), cardX, y);

        // Suggestion text
        ctx.font = '18px Georgia, serif';
        ctx.fillStyle = '#f5e6c8';
        ctx.fillText('Prova Chrome eller uppdatera webbläsaren', cardX, y + 40);
      } else if (isLoading) {
        ctx.font = 'bold 24px Georgia, serif';
        ctx.fillStyle = '#d4af37';
        const dots = '.'.repeat((Math.floor(frame / 20) % 4));
        ctx.fillText(loadingText + dots, cardX, cardY + 120);
      }
      // Button is rendered as HTML overlay when not loading and no error

      ctx.textAlign = 'left';

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isLoading, loadingText, errorText]);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
      {!isLoading && !errorText && (
        <button
          onClick={onStart}
          onMouseEnter={() => setButtonHover(true)}
          onMouseLeave={() => setButtonHover(false)}
          style={{
            position: 'fixed',
            left: '50%',
            top: '55%',
            transform: 'translateX(-50%)',
            padding: '16px 48px',
            fontSize: '28px',
            fontFamily: 'Georgia, serif',
            fontWeight: 'bold',
            color: '#ffffff',
            background: buttonHover
              ? 'linear-gradient(180deg, #2ecc71 0%, #27ae60 100%)'
              : 'linear-gradient(180deg, #27ae60 0%, #1e8449 100%)',
            border: '3px solid #d4af37',
            borderRadius: '12px',
            cursor: 'pointer',
            boxShadow: buttonHover
              ? '0 8px 25px rgba(39, 174, 96, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)'
              : '0 6px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
            transition: 'all 0.2s ease',
            letterSpacing: '1px',
          }}
        >
          Starta spelet
        </button>
      )}
    </div>
  );
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerRadius: number,
  points: number,
  innerRatio: number,
  color: string
): void {
  const innerRadius = outerRadius * innerRatio;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, groundY: number, scale: number): void {
  // Trunk
  ctx.fillStyle = '#3d2817';
  ctx.fillRect(x - 8 * scale, groundY - 20 * scale, 16 * scale, 20 * scale);

  // Tree layers - darker green
  for (let layer = 0; layer < 4; layer++) {
    const layerY = groundY - 20 * scale - layer * 28 * scale;
    const layerWidth = (65 - layer * 12) * scale;

    // Shadow layer
    ctx.fillStyle = '#0d2818';
    ctx.beginPath();
    ctx.moveTo(x, layerY - 35 * scale);
    ctx.lineTo(x - layerWidth / 2 - 3, layerY + 3);
    ctx.lineTo(x + layerWidth / 2 + 3, layerY + 3);
    ctx.closePath();
    ctx.fill();

    // Main layer
    ctx.fillStyle = '#1a4d2e';
    ctx.beginPath();
    ctx.moveTo(x, layerY - 35 * scale);
    ctx.lineTo(x - layerWidth / 2, layerY);
    ctx.lineTo(x + layerWidth / 2, layerY);
    ctx.closePath();
    ctx.fill();
  }

  // Snow on branches
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.85;
  for (let layer = 0; layer < 4; layer++) {
    const layerY = groundY - 20 * scale - layer * 28 * scale;
    const layerWidth = ((65 - layer * 12) * scale) * 0.4;
    ctx.beginPath();
    ctx.ellipse(x, layerY - 28 * scale, layerWidth / 2, 4 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Star on top
  const starY = groundY - 20 * scale - 4 * 28 * scale - 8 * scale;
  drawStar(ctx, x, starY, 12 * scale, 5, 0.5, '#d4af37');
}

function drawHolly(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Leaves - darker green
  ctx.fillStyle = '#1a6b35';
  for (let i = 0; i < 3; i++) {
    const angle = (i - 1) * 0.6;
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -14, 7, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Berries - bright red
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.arc(-5, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(5, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -5, 6, 0, Math.PI * 2);
  ctx.fill();

  // Berry highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(-3, -2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(7, -2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(2, -7, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
