import { useEffect, useRef } from 'react';

/**
 * BackgroundRenderer — Render berbagai jenis background untuk proyektor.
 *
 * bg_type:
 *   'solid'      → warna solid biasa
 *   'gradient'   → gradient 2 warna dengan arah
 *   'animated'   → animasi background (pilih dari preset)
 *
 * bg_config (JSON string atau object):
 *   solid:    { color: '#000000' }
 *   gradient: { from: '#1a237e', to: '#4a148c', angle: 135 }
 *   animated: { preset: 'waves'|'aurora'|'pulse'|'particles'|'nebula'|'fire'|'ocean' }
 */

// ─── CSS Animations (injected sekali) ─────────────────────────────────────────
const STYLE_ID = 'bg-renderer-styles';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* ── Aurora ── */
    @keyframes aurora-shift {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .bg-aurora {
      background: linear-gradient(-45deg, #0d1b2a, #1a237e, #4a148c, #0d47a1, #006064);
      background-size: 400% 400%;
      animation: aurora-shift 12s ease infinite;
    }

    /* ── Waves ── */
    @keyframes wave-drift {
      0%   { background-position: 0 0, 0 0; }
      100% { background-position: 200px 200px, -200px -200px; }
    }
    .bg-waves {
      background-color: #0a192f;
      background-image:
        radial-gradient(ellipse at 20% 50%, rgba(0,120,255,0.15) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 50%, rgba(120,0,255,0.1) 0%, transparent 60%);
      animation: wave-drift 8s linear infinite alternate;
    }

    /* ── Pulse ── */
    @keyframes pulse-bg {
      0%, 100% { background-size: 100% 100%; opacity: 1; }
      50%       { background-size: 120% 120%; opacity: 0.85; }
    }
    .bg-pulse {
      background: radial-gradient(ellipse at center, #1a237e 0%, #0d0d0d 70%);
      animation: pulse-bg 4s ease-in-out infinite;
    }

    /* ── Nebula ── */
    @keyframes nebula-rotate {
      0%   { transform: rotate(0deg) scale(1.1); }
      100% { transform: rotate(360deg) scale(1.1); }
    }
    .bg-nebula {
      background: #050510;
      overflow: hidden;
    }
    .bg-nebula::before {
      content: '';
      position: absolute;
      inset: -50%;
      background: conic-gradient(
        from 0deg at 50% 50%,
        #4a148c22, #0d47a133, #00695c22, #1a237e44, #4a148c22
      );
      animation: nebula-rotate 20s linear infinite;
    }
    .bg-nebula::after {
      content: '';
      position: absolute;
      inset: -30%;
      background: conic-gradient(
        from 180deg at 50% 50%,
        transparent, #7b1fa222, transparent, #1565c022, transparent
      );
      animation: nebula-rotate 15s linear infinite reverse;
    }

    /* ── Fire ── */
    @keyframes fire-flicker {
      0%, 100% { background-position: 0% 100%; }
      25%       { background-position: 10% 90%; }
      50%       { background-position: -5% 95%; }
      75%       { background-position: 5% 85%; }
    }
    .bg-fire {
      background: linear-gradient(to top, #b71c1c, #e65100, #f57f17, #1a0000);
      background-size: 100% 200%;
      animation: fire-flicker 3s ease-in-out infinite;
    }

    /* ── Ocean ── */
    @keyframes ocean-flow {
      0%   { background-position: 0% 0%; }
      50%  { background-position: 100% 100%; }
      100% { background-position: 0% 0%; }
    }
    .bg-ocean {
      background: linear-gradient(135deg, #006064, #01579b, #0d47a1, #004d40, #006064);
      background-size: 300% 300%;
      animation: ocean-flow 10s ease infinite;
    }

    /* ── Sunrise ── */
    @keyframes sunrise-glow {
      0%   { background-position: 50% 100%; }
      50%  { background-position: 50% 30%; }
      100% { background-position: 50% 100%; }
    }
    .bg-sunrise {
      background: linear-gradient(to top, #b71c1c, #e65100, #f57f17, #fdd835, #1a237e, #0d0d2b);
      background-size: 100% 300%;
      animation: sunrise-glow 8s ease-in-out infinite;
    }

    /* ── Gradient animated ── */
    @keyframes grad-flow {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .bg-gradient-anim {
      background-size: 200% 200%;
      animation: grad-flow 8s ease infinite;
    }

    /* ── Particles canvas ── */
    .bg-particles { background: #050510; }
  `;
  document.head.appendChild(style);
}

// ─── Canvas Particles ─────────────────────────────────────────────────────────
function ParticlesCanvas({ color = '#ffffff' }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Parse color to rgba
    const hex = color.replace('#', '');
    const r = parseInt(hex.slice(0,2),16);
    const g = parseInt(hex.slice(2,4),16);
    const b = parseInt(hex.slice(4,6),16);

    const PARTICLE_COUNT = 80;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x:    Math.random() * canvas.width,
      y:    Math.random() * canvas.height,
      vx:   (Math.random() - 0.5) * 0.4,
      vy:   -Math.random() * 0.6 - 0.1,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.6 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;
        p.alpha += (Math.random() - 0.5) * 0.01;
        p.alpha = Math.max(0.05, Math.min(0.7, p.alpha));

        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
      });
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BackgroundRenderer({
  bgType    = 'solid',
  bgConfig  = {},
  children,
  style = {},
  className = '',
}) {
  useEffect(() => { injectStyles(); }, []);

  const cfg = typeof bgConfig === 'string' ? (() => { try { return JSON.parse(bgConfig); } catch { return {}; } })() : bgConfig;

  // ── Solid ──────────────────────────────────────────────────────
  if (bgType === 'solid') {
    return (
      <div
        className={className}
        style={{ ...style, backgroundColor: cfg.color || '#000000', position: 'relative', overflow: 'hidden' }}
      >
        {children}
      </div>
    );
  }

  // ── Gradient ───────────────────────────────────────────────────
  if (bgType === 'gradient') {
    const from  = cfg.from  || '#1a237e';
    const to    = cfg.to    || '#4a148c';
    const angle = cfg.angle ?? 135;
    const animated = cfg.animated ?? false;

    return (
      <div
        className={`${className} ${animated ? 'bg-gradient-anim' : ''}`}
        style={{
          ...style,
          background: animated
            ? `linear-gradient(${angle}deg, ${from}, ${to}, ${from})`
            : `linear-gradient(${angle}deg, ${from}, ${to})`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    );
  }

  // ── Animated presets ───────────────────────────────────────────
  if (bgType === 'animated') {
    const preset = cfg.preset || 'aurora';

    if (preset === 'particles') {
      const particleColor = cfg.particle_color || '#ffffff';
      const bgColor       = cfg.bg_color || '#050510';
      return (
        <div
          className={`bg-particles ${className}`}
          style={{ ...style, backgroundColor: bgColor, position: 'relative', overflow: 'hidden' }}
        >
          <ParticlesCanvas color={particleColor} />
          <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {children}
          </div>
        </div>
      );
    }

    const presetClass = {
      aurora:  'bg-aurora',
      waves:   'bg-waves',
      pulse:   'bg-pulse',
      nebula:  'bg-nebula',
      fire:    'bg-fire',
      ocean:   'bg-ocean',
      sunrise: 'bg-sunrise',
    }[preset] || 'bg-aurora';

    return (
      <div
        className={`${presetClass} ${className}`}
        style={{ ...style, position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className={className} style={{ ...style, backgroundColor: '#000', position: 'relative', overflow: 'hidden' }}>
      {children}
    </div>
  );
}
