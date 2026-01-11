import { useRef, useEffect } from 'react';

interface MenuProps {
  isLoading: boolean;
  loadingText: string;
  onStart: () => void;
}

export function Menu({ isLoading, loadingText, onStart }: MenuProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const animationRef = useRef<number | null>(null);

  // Auto-start when loading is complete
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        onStart();
      }, 1500); // Wait 1.5 seconds after loading to let user see the screen
      return () => clearTimeout(timer);
    }
  }, [isLoading, onStart]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Snowflakes
    const snowflakes: { x: number; y: number; size: number; speed: number; wobble: number }[] = [];
    for (let i = 0; i < 80; i++) {
      snowflakes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 1.5 + 0.5,
        wobble: Math.random() * Math.PI * 2,
      });
    }

    const render = () => {
      frameRef.current++;
      const frame = frameRef.current;

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0a1628');
      grad.addColorStop(0.4, '#1a3a5c');
      grad.addColorStop(0.8, '#2d5a87');
      grad.addColorStop(1, '#1a4a6e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        const x = (i * 41 + frame * 0.03) % canvas.width;
        const y = (i * 31) % (canvas.height * 0.5);
        const twinkle = Math.sin(frame * 0.04 + i * 1.5) * 0.5 + 0.5;
        ctx.globalAlpha = 0.2 + twinkle * 0.6;
        ctx.beginPath();
        ctx.arc(x, y, 1 + twinkle, 0, Math.PI * 2);
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
        ctx.globalAlpha = 0.5 + flake.size * 0.15;
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Snow ground
      const groundY = canvas.height - 80;
      const snowGrad = ctx.createLinearGradient(0, groundY, 0, canvas.height);
      snowGrad.addColorStop(0, '#e8f4f8');
      snowGrad.addColorStop(0.3, '#d4e9ed');
      snowGrad.addColorStop(1, '#b8d4dc');
      ctx.fillStyle = snowGrad;
      ctx.fillRect(0, groundY, canvas.width, 80);

      // Snow bumps
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < canvas.width; i += 40) {
        const height = Math.sin(i * 0.08 + frame * 0.01) * 8 + 12;
        ctx.beginPath();
        ctx.ellipse(i + 20, groundY, 25, height, 0, Math.PI, 0);
        ctx.fill();
      }

      // Christmas trees on sides
      drawTree(ctx, canvas.width * 0.08, groundY, 0.8);
      drawTree(ctx, canvas.width * 0.18, groundY, 0.5);
      drawTree(ctx, canvas.width * 0.82, groundY, 0.6);
      drawTree(ctx, canvas.width * 0.92, groundY, 0.9);

      // Card background
      const cardX = canvas.width / 2;
      const cardY = canvas.height / 2 - 30;
      const cardW = 600;
      const cardH = 420;

      // Card shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.roundRect(cardX - cardW / 2 + 8, cardY - cardH / 2 + 8, cardW, cardH, 20);
      ctx.fill();

      // Card body
      const cardGrad = ctx.createLinearGradient(cardX - cardW / 2, cardY - cardH / 2, cardX + cardW / 2, cardY + cardH / 2);
      cardGrad.addColorStop(0, '#1a2a4a');
      cardGrad.addColorStop(1, '#0d1a2d');
      ctx.fillStyle = cardGrad;
      ctx.beginPath();
      ctx.roundRect(cardX - cardW / 2, cardY - cardH / 2, cardW, cardH, 20);
      ctx.fill();

      // Card border
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Inner decorative border
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cardX - cardW / 2 + 15, cardY - cardH / 2 + 15, cardW - 30, cardH - 30, 12);
      ctx.stroke();

      // Corner decorations (holly)
      drawHolly(ctx, cardX - cardW / 2 + 40, cardY - cardH / 2 + 40, 0.7);
      drawHolly(ctx, cardX + cardW / 2 - 40, cardY - cardH / 2 + 40, 0.7);
      drawHolly(ctx, cardX - cardW / 2 + 40, cardY + cardH / 2 - 40, 0.7);
      drawHolly(ctx, cardX + cardW / 2 - 40, cardY + cardH / 2 - 40, 0.7);

      // Title
      ctx.textAlign = 'center';
      ctx.font = 'bold 64px Georgia, serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#c0392b';
      ctx.fillText('Julspelet', cardX, cardY - 100);
      ctx.shadowBlur = 0;

      // Decorative stars around title
      for (let i = 0; i < 5; i++) {
        const starX = cardX - 200 + i * 100;
        const starY = cardY - 140 + Math.sin(frame * 0.05 + i) * 5;
        const starSize = 8 + Math.sin(frame * 0.08 + i * 2) * 2;
        drawStar(ctx, starX, starY, starSize, 5, 0.5, '#f1c40f');
      }

      // Subtitle
      ctx.font = '28px Georgia, serif';
      ctx.fillStyle = '#87ceeb';
      ctx.fillText('Fånga paketen, undvik snöbollarna!', cardX, cardY - 40);

      // Instructions
      ctx.font = '22px Georgia, serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Stå upp och fånga julklappar', cardX, cardY + 20);
      ctx.fillText('Ducka för flygande snöbollar', cardX, cardY + 55);
      ctx.fillText('Hoppa över rullande snöbollar', cardX, cardY + 90);

      // Loading / ready text
      ctx.font = 'bold 26px Georgia, serif';
      if (isLoading) {
        ctx.fillStyle = '#f1c40f';
        const dots = '.'.repeat((Math.floor(frame / 20) % 4));
        ctx.fillText(loadingText + dots, cardX, cardY + 150);
      } else {
        ctx.fillStyle = '#27ae60';
        ctx.fillText('Ställ dig framför kameran...', cardX, cardY + 150);
      }

      ctx.textAlign = 'left';

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isLoading, loadingText]);

  return (
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
  ctx.fillStyle = '#4a3728';
  ctx.fillRect(x - 6 * scale, groundY - 15 * scale, 12 * scale, 15 * scale);

  // Tree layers
  ctx.fillStyle = '#1a4d2e';
  for (let layer = 0; layer < 3; layer++) {
    const layerY = groundY - 15 * scale - layer * 25 * scale;
    const layerWidth = (55 - layer * 12) * scale;
    ctx.beginPath();
    ctx.moveTo(x, layerY - 30 * scale);
    ctx.lineTo(x - layerWidth / 2, layerY);
    ctx.lineTo(x + layerWidth / 2, layerY);
    ctx.closePath();
    ctx.fill();
  }

  // Snow
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.7;
  for (let layer = 0; layer < 3; layer++) {
    const layerY = groundY - 15 * scale - layer * 25 * scale;
    const layerWidth = ((55 - layer * 12) * scale) * 0.5;
    ctx.beginPath();
    ctx.ellipse(x, layerY - 25 * scale, layerWidth / 2, 5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Star
  const starY = groundY - 15 * scale - 3 * 25 * scale - 10 * scale;
  drawStar(ctx, x, starY, 10 * scale, 5, 0.5, '#f1c40f');
}

function drawHolly(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Leaves
  ctx.fillStyle = '#27ae60';
  for (let i = 0; i < 3; i++) {
    const angle = (i - 1) * 0.5;
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -12, 6, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Berries
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.arc(-4, 0, 5, 0, Math.PI * 2);
  ctx.arc(4, 0, 5, 0, Math.PI * 2);
  ctx.arc(0, -4, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
