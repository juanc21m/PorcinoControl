import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LOGO_URL, APP_NAME } from '../lib/brand';

/**
 * Pantalla de bienvenida (ruta `/`).
 *
 * Fondo cinemático: video en bucle y silencioso (autoplay/loop/muted/playsinline)
 * servido desde una URL pública (no se versiona en el repo por peso), con un
 * overlay oscuro encima para que la tarjeta blanca central resalte.
 * Si el video aún no carga, el fondo base oscuro (bg-slate-900) hace de respaldo.
 */
export default function SplashScreen() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const enter = () => navigate(isAuthenticated ? '/dashboard' : '/login', { replace: true });

  return (
    <div className="fixed inset-0 bg-slate-900 overflow-hidden">
      {/* Video de fondo (dron de la finca) */}
      <video
        className="absolute inset-0 w-full h-full object-cover z-0"
        src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      />

      {/* Overlay oscuro: apaga el video para dar contraste a la tarjeta */}
      <div className="absolute inset-0 z-[1] bg-slate-900/50" aria-hidden="true" />

      {/* Panel de bienvenida anclado a la esquina inferior derecha
          (deja el centro libre para apreciar el video) */}
      <div className="relative z-10 h-full flex justify-end items-end p-6 sm:p-8 md:p-16">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center text-center">
          <img src={LOGO_URL} alt={APP_NAME} className="w-full max-w-[220px] h-auto object-contain" />
          <p className="mt-3 text-gray-700 text-sm font-medium">Sistema de Gestión Porcina</p>

          <button
            onClick={enter}
            className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg text-sm transition-colors shadow-lg shadow-emerald-900/20"
          >
            Ingresar al ERP
          </button>

          <p className="mt-5 text-gray-400 text-xs">v1.0.0 — Agrocomercial Moreno</p>
        </div>
      </div>
    </div>
  );
}
