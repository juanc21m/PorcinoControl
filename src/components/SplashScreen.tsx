import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LOGO_URL, APP_NAME } from '../lib/brand';

/**
 * Pantalla de bienvenida interactiva (ruta `/`).
 *
 * Ya NO redirige automáticamente: toda la pantalla es cliqueable y, al tocarla,
 * lleva a `/dashboard` si hay sesión activa o a `/login` si no la hay.
 *
 * El fondo es un valle verde inspirado en Volcán, Chiriquí (cielo, montañas,
 * camino de tierra) hecho con SVG + gradientes, y un granjero empujando una
 * carretilla con sacos de alimento cruza el camino en bucle infinito.
 */
export default function SplashScreen() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const enter = () => navigate(isAuthenticated ? '/dashboard' : '/login', { replace: true });

  return (
    <div
      onClick={enter}
      role="button"
      tabIndex={0}
      aria-label="Toca la pantalla para entrar al sistema"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') enter(); }}
      className="fixed inset-0 z-50 overflow-hidden cursor-pointer select-none"
    >
      {/* ===================== PAISAJE DE FONDO ===================== */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 810"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7ec8f0" />
            <stop offset="55%" stopColor="#bfe6f7" />
            <stop offset="100%" stopColor="#e8f6ec" />
          </linearGradient>
          <linearGradient id="mtnBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8fb6c9" />
            <stop offset="100%" stopColor="#7ba7bd" />
          </linearGradient>
          <linearGradient id="mtnMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b9e6b" />
            <stop offset="100%" stopColor="#3f8557" />
          </linearGradient>
          <linearGradient id="valley" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5fae5a" />
            <stop offset="100%" stopColor="#3c8a3f" />
          </linearGradient>
          <linearGradient id="path" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9a36b" />
            <stop offset="100%" stopColor="#a9824d" />
          </linearGradient>
        </defs>

        {/* Cielo */}
        <rect x="0" y="0" width="1440" height="810" fill="url(#sky)" />

        {/* Sol con resplandor */}
        <circle className="animate-sun-glow" cx="1200" cy="150" r="70" fill="#fff4c2" />
        <circle cx="1200" cy="150" r="46" fill="#ffe680" />

        {/* Nubes */}
        <g className="animate-cloud-drift" fill="#ffffff" opacity="0.92">
          <g transform="translate(250 130)">
            <ellipse cx="0" cy="0" rx="55" ry="26" />
            <ellipse cx="45" cy="8" rx="42" ry="22" />
            <ellipse cx="-45" cy="10" rx="38" ry="20" />
          </g>
          <g transform="translate(720 90)">
            <ellipse cx="0" cy="0" rx="48" ry="22" />
            <ellipse cx="40" cy="6" rx="36" ry="18" />
            <ellipse cx="-38" cy="8" rx="32" ry="16" />
          </g>
        </g>

        {/* Montañas de fondo (Volcán Barú) */}
        <path d="M0 430 L230 250 L360 360 L560 200 L760 380 L980 240 L1200 400 L1440 300 L1440 560 L0 560 Z"
              fill="url(#mtnBack)" />
        {/* Picos nevados */}
        <path d="M560 200 L520 250 L545 245 L560 230 L580 252 L600 248 Z" fill="#ffffff" opacity="0.9" />
        <path d="M980 240 L948 282 L968 276 L980 262 L996 284 L1014 280 Z" fill="#ffffff" opacity="0.85" />

        {/* Colinas verdes intermedias */}
        <path d="M0 470 Q360 360 720 460 T1440 440 L1440 620 L0 620 Z" fill="url(#mtnMid)" />

        {/* Valle (primer plano) */}
        <rect x="0" y="560" width="1440" height="250" fill="url(#valley)" />

        {/* Camino de tierra horizontal */}
        <rect x="0" y="648" width="1440" height="96" fill="url(#path)" />
        <rect x="0" y="648" width="1440" height="8" fill="#b89058" opacity="0.6" />
        {/* Piedritas del camino */}
        <g fill="#8f6a3c" opacity="0.5">
          <ellipse cx="180" cy="700" rx="10" ry="4" />
          <ellipse cx="520" cy="720" rx="13" ry="5" />
          <ellipse cx="900" cy="690" rx="9" ry="4" />
          <ellipse cx="1240" cy="715" rx="12" ry="5" />
        </g>

        {/* Manchones de pasto al borde del camino */}
        <g fill="#347a37">
          <path d="M60 648 q6 -18 12 0 q6 -22 12 0 q6 -16 12 0 Z" />
          <path d="M1320 648 q6 -18 12 0 q6 -22 12 0 q6 -16 12 0 Z" />
          <path d="M700 648 q6 -16 12 0 q6 -20 12 0 q6 -14 12 0 Z" />
        </g>
      </svg>

      {/* ===================== GRANJERO + CARRETILLA ===================== */}
      {/* Grupo exterior: cruza la pantalla. Posición vertical sobre el camino. */}
      <div className="animate-farmer-walk absolute" style={{ bottom: '11%', left: 0 }}>
        <div className="animate-farmer-bob">
          <svg
            width="240"
            height="190"
            viewBox="0 0 240 190"
            className="w-40 sm:w-52 md:w-60 h-auto drop-shadow-[0_10px_10px_rgba(0,0,0,0.25)]"
            aria-hidden="true"
          >
            {/* ---------- CARRETILLA ---------- */}
            {/* Rueda */}
            <g transform="translate(196 160)">
              <circle r="20" fill="#3a3a3a" />
              <circle r="20" fill="none" stroke="#222" strokeWidth="3" />
              <g className="animate-wheel-spin">
                <circle r="7" fill="#9aa0a6" />
                <line x1="-18" y1="0" x2="18" y2="0" stroke="#6b7075" strokeWidth="3" />
                <line x1="0" y1="-18" x2="0" y2="18" stroke="#6b7075" strokeWidth="3" />
                <line x1="-13" y1="-13" x2="13" y2="13" stroke="#6b7075" strokeWidth="3" />
                <line x1="-13" y1="13" x2="13" y2="-13" stroke="#6b7075" strokeWidth="3" />
              </g>
            </g>

            {/* Pata de apoyo */}
            <line x1="150" y1="138" x2="138" y2="172" stroke="#4a4a4a" strokeWidth="6" strokeLinecap="round" />

            {/* Mango trasero (hacia el granjero) */}
            <line x1="120" y1="118" x2="72" y2="120" stroke="#7a4a22" strokeWidth="7" strokeLinecap="round" />

            {/* Tina de la carretilla */}
            <path d="M112 110 L210 110 L196 142 L126 142 Z" fill="#e8822e" stroke="#c4661a" strokeWidth="3" strokeLinejoin="round" />
            <path d="M112 110 L210 110 L206 120 L116 120 Z" fill="#f59b4d" />

            {/* ---------- SACOS DE ALIMENTO ---------- */}
            <g stroke="#b79b6a" strokeWidth="1.5">
              {/* saco 1 */}
              <rect x="120" y="78" width="34" height="34" rx="11" fill="#efe2c2" />
              <line x1="137" y1="80" x2="137" y2="110" stroke="#cdbb8f" strokeWidth="2" />
              <line x1="124" y1="86" x2="150" y2="86" stroke="#cdbb8f" strokeWidth="1.5" />
              {/* saco 2 */}
              <rect x="156" y="74" width="36" height="38" rx="12" fill="#e7d8b4" />
              <line x1="174" y1="76" x2="174" y2="110" stroke="#c8b487" strokeWidth="2" />
              <line x1="160" y1="83" x2="188" y2="83" stroke="#c8b487" strokeWidth="1.5" />
              {/* saco 3 (encima) */}
              <rect x="142" y="56" width="32" height="30" rx="10" fill="#f3e8cc" />
              <line x1="158" y1="58" x2="158" y2="84" stroke="#d2c096" strokeWidth="2" />
            </g>

            {/* ---------- GRANJERO (mirando a la derecha) ---------- */}
            {/* Piernas (hueco/cadera en y≈120) */}
            <g className="animate-leg-b">
              <rect x="46" y="120" width="9" height="44" rx="4" fill="#5b4632" />
              <rect x="42" y="160" width="20" height="8" rx="3" fill="#3a2c1d" />
            </g>
            <g className="animate-leg-a">
              <rect x="58" y="120" width="9" height="44" rx="4" fill="#6b5238" />
              <rect x="56" y="160" width="20" height="8" rx="3" fill="#43331f" />
            </g>

            {/* Torso / camisa */}
            <path d="M44 78 Q56 70 70 78 L74 122 Q57 130 40 122 Z" fill="#2E7D32" />
            <path d="M44 78 Q56 70 70 78 L71 92 Q57 98 43 92 Z" fill="#3a9d40" />

            {/* Brazo hacia el mango */}
            <path d="M64 86 Q80 96 78 116" fill="none" stroke="#2E7D32" strokeWidth="9" strokeLinecap="round" />
            <circle cx="78" cy="118" r="6" fill="#e8b48a" />

            {/* Cuello + cabeza */}
            <rect x="54" y="58" width="9" height="10" fill="#e8b48a" />
            <circle cx="58" cy="50" r="13" fill="#f2c39b" />
            {/* oreja */}
            <circle cx="47" cy="51" r="3" fill="#e8b48a" />

            {/* Sombrero de granjero (paja) */}
            <ellipse cx="58" cy="40" rx="28" ry="8" fill="#d9a441" />
            <ellipse cx="58" cy="40" rx="28" ry="8" fill="none" stroke="#b9842c" strokeWidth="1.5" />
            <path d="M44 40 Q46 24 58 23 Q70 24 72 40 Z" fill="#e6b455" />
            <path d="M44 40 Q46 24 58 23 Q70 24 72 40" fill="none" stroke="#b9842c" strokeWidth="1.5" />
            <rect x="44" y="36" width="28" height="5" rx="2" fill="#7a4a22" />
          </svg>
        </div>
      </div>

      {/* ===================== MARCA + LLAMADA A LA ACCIÓN ===================== */}
      <div className="absolute inset-x-0 top-0 flex flex-col items-center pt-10 sm:pt-14 px-4 text-center">
        <span className="bg-white rounded-2xl px-5 py-3 sm:px-6 sm:py-4 inline-flex items-center shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
          <img
            src={LOGO_URL}
            alt={APP_NAME}
            className="h-16 sm:h-20 w-auto object-contain"
          />
        </span>
        <p className="mt-3 text-emerald-50/90 text-sm sm:text-base font-medium tracking-wide drop-shadow">
          Sistema de Gestión Porcina
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-10 sm:pb-14 px-4 text-center">
        <p className="animate-text-pulse text-white text-base sm:text-lg font-semibold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          Toca la pantalla para entrar al sistema
        </p>
        <span className="mt-3 inline-block h-1.5 w-24 rounded-full bg-white/60 animate-text-pulse" />
      </div>
    </div>
  );
}
