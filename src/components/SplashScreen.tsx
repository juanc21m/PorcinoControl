import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Pantalla de carga a pantalla completa (ruta `/`). Muestra un cerdo
 * "corriendo" de lado a lado con animación CSS nativa y, tras 3.5s,
 * redirige automáticamente a `/login`.
 */
export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/login', { replace: true }), 3500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 overflow-hidden">
      {/* Halo de fondo */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-3xl" />

      {/* Pista por la que corre el cerdo */}
      <div className="relative w-full max-w-3xl h-40 flex items-center">
        <span
          className="animate-pig-run absolute left-0 select-none"
          style={{ fontSize: '88px', filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.55))' }}
          role="img"
          aria-label="cerdo corriendo"
        >
          🐷
        </span>
        {/* Suelo con textura en movimiento */}
        <div
          className="animate-ground absolute bottom-3 left-0 right-0 h-1.5 rounded-full opacity-60"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, #10b981 0 24px, transparent 24px 80px)',
          }}
        />
      </div>

      {/* Marca + texto de carga */}
      <div className="animate-splash-in relative z-10 mt-8 flex flex-col items-center gap-3">
        <h1 className="text-white font-bold text-3xl tracking-tight">
          Porci<span className="text-emerald-400">Control</span>
        </h1>
        <p className="animate-text-pulse text-slate-300 text-sm font-medium tracking-wide">
          Cargando PorciControl…
        </p>
        {/* Barra de progreso indeterminada */}
        <div className="mt-2 w-56 h-1 rounded-full bg-slate-700/60 overflow-hidden">
          <div className="animate-pig-run h-full w-1/3 bg-emerald-500 rounded-full" />
        </div>
      </div>
    </div>
  );
}
