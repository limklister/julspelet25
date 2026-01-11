import { useRef, useEffect } from 'react';

interface WinScreenProps {
  onPlayAgain: () => void;
}

export function WinScreen({ onPlayAgain }: WinScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Snowflakes for animation
    const snowflakes: { x: number; y: number; size: number; speed: number; wobble: number }[] = [];
    for (let i = 0; i < 100; i++) {
      snowflakes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 4 + 1,
        speed: Math.random() * 2 + 0.5,
        wobble: Math.random() * Math.PI * 2,
      });
    }

    const render = () => {
      frameRef.current++;
      const frame = frameRef.current;

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0a1628');
      grad.addColorStop(0.5, '#1a3a5c');
      grad.addColorStop(1, '#2d5a87');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Animated stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 50; i++) {
        const x = (i * 37 + frame * 0.05) % canvas.width;
        const y = (i * 29) % (canvas.height * 0.6);
        const twinkle = Math.sin(frame * 0.03 + i) * 0.5 + 0.5;
        ctx.globalAlpha = 0.2 + twinkle * 0.8;
        ctx.beginPath();
        ctx.arc(x, y, 1 + twinkle * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Falling snowflakes
      ctx.fillStyle = '#ffffff';
      for (const flake of snowflakes) {
        flake.y += flake.speed;
        flake.x += Math.sin(frame * 0.02 + flake.wobble) * 0.5;
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

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Decorative stars around text
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + frame * 0.01;
        const dist = 200 + Math.sin(frame * 0.05 + i) * 30;
        const x = centerX + Math.cos(angle) * dist;
        const y = centerY + Math.sin(angle) * dist - 50;
        const starSize = 12 + Math.sin(frame * 0.1 + i * 2) * 4;
        drawStar(ctx, x, y, starSize, 5, 0.5, '#f1c40f');
      }

      // Christmas tree on the left
      drawChristmasTree(ctx, centerX - 300, centerY + 150, 1.2);

      // Christmas tree on the right
      drawChristmasTree(ctx, centerX + 300, centerY + 150, 1.0);

      // Main title - "GOD JUL!"
      ctx.save();
      ctx.font = 'bold 72px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';

      // Text shadow/glow
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#c0392b';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('GOD JUL!', centerX, centerY - 80);
      ctx.shadowBlur = 0;

      // Decorative line
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX - 150, centerY - 50);
      ctx.lineTo(centerX + 150, centerY - 50);
      ctx.stroke();

      // Small stars on the line
      drawStar(ctx, centerX - 160, centerY - 50, 10, 5, 0.5, '#f1c40f');
      drawStar(ctx, centerX + 160, centerY - 50, 10, 5, 0.5, '#f1c40f');

      // "önskar" text
      ctx.font = '32px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#87ceeb';
      ctx.fillText('önskar', centerX, centerY - 10);

      // Names
      ctx.font = 'bold 48px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#27ae60';
      ctx.fillText('Folke, Ellis, Alex & Anna', centerX, centerY + 50);
      ctx.shadowBlur = 0;

      // Decorative holly leaves
      drawHolly(ctx, centerX - 200, centerY + 80);
      drawHolly(ctx, centerX + 200, centerY + 80);

      ctx.restore();

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
      <button
        onClick={onPlayAgain}
        style={{
          position: 'absolute',
          bottom: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '16px 48px',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#ffffff',
          backgroundColor: '#c0392b',
          border: '3px solid #f1c40f',
          borderRadius: '12px',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(192, 57, 43, 0.5)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 30px rgba(192, 57, 43, 0.7)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(192, 57, 43, 0.5)';
        }}
      >
        Spela igen
      </button>
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

function drawChristmasTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  scale: number
): void {
  ctx.save();

  // Trunk
  ctx.fillStyle = '#4a3728';
  ctx.fillRect(x - 8 * scale, groundY - 20 * scale, 16 * scale, 20 * scale);

  // Tree layers
  ctx.fillStyle = '#1a4d2e';
  for (let layer = 0; layer < 4; layer++) {
    const layerY = groundY - 20 * scale - layer * 30 * scale;
    const layerWidth = (70 - layer * 12) * scale;
    ctx.beginPath();
    ctx.moveTo(x, layerY - 35 * scale);
    ctx.lineTo(x - layerWidth / 2, layerY);
    ctx.lineTo(x + layerWidth / 2, layerY);
    ctx.closePath();
    ctx.fill();
  }

  // Snow on tree
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.7;
  for (let layer = 0; layer < 4; layer++) {
    const layerY = groundY - 20 * scale - layer * 30 * scale;
    const layerWidth = ((70 - layer * 12) * scale) * 0.6;
    ctx.beginPath();
    ctx.ellipse(x, layerY - 28 * scale, layerWidth / 2, 6 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Star on top
  const starY = groundY - 20 * scale - 4 * 30 * scale - 15 * scale;
  drawStar(ctx, x, starY, 15 * scale, 5, 0.5, '#f1c40f');

  // Ornaments
  const ornamentColors = ['#c0392b', '#f1c40f', '#3498db', '#9b59b6'];
  for (let layer = 0; layer < 3; layer++) {
    const layerY = groundY - 35 * scale - layer * 30 * scale;
    const layerWidth = (60 - layer * 12) * scale;
    for (let i = 0; i < 3; i++) {
      const ox = x - layerWidth / 3 + (i * layerWidth / 3);
      const oy = layerY + Math.sin(i + layer) * 5 * scale;
      ctx.fillStyle = ornamentColors[(layer + i) % ornamentColors.length];
      ctx.beginPath();
      ctx.arc(ox, oy, 5 * scale, 0, Math.PI * 2);
      ctx.fill();
      // Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(ox - 2 * scale, oy - 2 * scale, 2 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawHolly(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();

  // Leaves
  ctx.fillStyle = '#27ae60';
  for (let i = 0; i < 3; i++) {
    const angle = (i - 1) * 0.4;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -15, 8, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Berries
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.arc(x - 5, y, 6, 0, Math.PI * 2);
  ctx.arc(x + 5, y, 6, 0, Math.PI * 2);
  ctx.arc(x, y - 5, 6, 0, Math.PI * 2);
  ctx.fill();

  // Berry highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(x - 7, y - 2, 2, 0, Math.PI * 2);
  ctx.arc(x + 3, y - 2, 2, 0, Math.PI * 2);
  ctx.arc(x - 2, y - 7, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
