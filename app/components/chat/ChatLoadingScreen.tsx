import { memo, useEffect, useState } from 'react';

const STEPS = [
  'Finding your project…',
  'Unpacking your chat history…',
  'Packing up your code…',
  'Carrying files to the workbench…',
  'Stacking components in place…',
  'Almost there…',
];

const STEP_INTERVAL_MS = 2400;

/*
 * Shown while a chat loads (from this browser or the server) instead of a blank page: a
 * worker in a hard hat carries boxes of code from the project store into the builder window.
 * Pure SVG + CSS, scoped by the `sitara-load-` prefix; motion stops for reduced-motion users.
 */
const STYLES = `
.sitara-load-walker { animation: sitara-load-walk 3.6s ease-in-out infinite; }
.sitara-load-facing { transform-box: fill-box; transform-origin: center; animation: sitara-load-turn 3.6s steps(1, end) infinite; }
.sitara-load-box { animation: sitara-load-carry 3.6s linear infinite; }
.sitara-load-leg-a { transform-box: fill-box; transform-origin: top center; animation: sitara-load-step 0.45s ease-in-out infinite alternate; }
.sitara-load-leg-b { transform-box: fill-box; transform-origin: top center; animation: sitara-load-step 0.45s ease-in-out infinite alternate-reverse; }
.sitara-load-bob { animation: sitara-load-bob 0.45s ease-in-out infinite alternate; }
.sitara-load-line { transform-box: fill-box; transform-origin: left center; animation: sitara-load-type 3.6s ease-out infinite; }
.sitara-load-line:nth-of-type(2) { animation-delay: 0.25s; }
.sitara-load-line:nth-of-type(3) { animation-delay: 0.5s; }
.sitara-load-drop { animation: sitara-load-drop 3.6s ease-in infinite; }
.sitara-load-fade { animation: sitara-load-fade 0.4s ease-out; }

@keyframes sitara-load-walk { 0%, 6% { transform: translateX(0); } 46%, 56% { transform: translateX(150px); } 96%, 100% { transform: translateX(0); } }
@keyframes sitara-load-turn { 0% { transform: scaleX(1); } 51% { transform: scaleX(-1); } 100% { transform: scaleX(1); } }
@keyframes sitara-load-carry { 0%, 47% { opacity: 1; } 48%, 97% { opacity: 0; } 98%, 100% { opacity: 1; } }
@keyframes sitara-load-step { from { transform: rotate(-18deg); } to { transform: rotate(18deg); } }
@keyframes sitara-load-bob { from { transform: translateY(0); } to { transform: translateY(-1.5px); } }
@keyframes sitara-load-type { 0%, 50% { transform: scaleX(0); opacity: 0.4; } 62%, 92% { transform: scaleX(1); opacity: 1; } 100% { transform: scaleX(1); opacity: 0; } }
@keyframes sitara-load-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes sitara-load-drop { 0%, 46% { opacity: 0; transform: translateY(-10px); } 52% { opacity: 1; transform: translateY(0); } 60%, 100% { opacity: 0; transform: translateY(4px); } }

@media (prefers-reduced-motion: reduce) {
  .sitara-load-walker, .sitara-load-facing, .sitara-load-box, .sitara-load-leg-a, .sitara-load-leg-b,
  .sitara-load-bob, .sitara-load-line, .sitara-load-drop, .sitara-load-fade { animation: none; }
}
`;

function CodeBox({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="22" height="18" rx="2.5" className="fill-accent-500/20 stroke-accent-500" strokeWidth="1.5" />
      <text x="11" y="12.5" textAnchor="middle" fontSize="8" fontFamily="monospace" className="fill-accent-500">
        {'</>'}
      </text>
    </g>
  );
}

function WorkerScene() {
  return (
    <svg viewBox="0 0 320 130" className="w-full max-w-[420px] text-bolt-elements-textSecondary" aria-hidden="true">
      <style>{STYLES}</style>

      {/* Ground */}
      <line x1="10" y1="112" x2="310" y2="112" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="4 6" />

      {/* Source: stacked project boxes */}
      <CodeBox x={14} y={94} />
      <CodeBox x={38} y={94} />
      <CodeBox x={26} y={76} />

      {/* Destination: the builder window */}
      <g transform="translate(244 58)">
        <rect width="64" height="54" rx="5" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.5" />
        <line x1="0" y1="11" x2="64" y2="11" stroke="currentColor" strokeOpacity="0.6" />
        <circle cx="7" cy="5.5" r="1.6" fill="currentColor" fillOpacity="0.6" />
        <circle cx="12.5" cy="5.5" r="1.6" fill="currentColor" fillOpacity="0.6" />
        <circle cx="18" cy="5.5" r="1.6" fill="currentColor" fillOpacity="0.6" />
        <g>
          <rect className="sitara-load-line fill-accent-500" x="8" y="19" width="36" height="3.5" rx="1.75" />
          <rect className="sitara-load-line" x="8" y="28" width="46" height="3.5" rx="1.75" fill="currentColor" />
          <rect className="sitara-load-line" x="8" y="37" width="28" height="3.5" rx="1.75" fill="currentColor" />
        </g>
        <g className="sitara-load-drop">
          <CodeBox x={21} y={-22} />
        </g>
      </g>

      {/* The worker */}
      <g className="sitara-load-walker">
        <g transform="translate(66 0)">
          <g className="sitara-load-facing">
            <g className="sitara-load-bob">
              {/* hard hat + head */}
              <path d="M8 58 a8 8 0 0 1 16 0 z" className="fill-accent-500" />
              <rect x="6" y="57" width="20" height="2.5" rx="1" className="fill-accent-500" />
              <circle cx="16" cy="64" r="5.5" fill="currentColor" />
              {/* body */}
              <line x1="16" y1="70" x2="16" y2="90" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              {/* arms reaching forward to the box */}
              <path
                d="M16 75 L27 79 L31 74"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M16 77 L25 83 L31 80"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* carried box */}
              <g className="sitara-load-box">
                <CodeBox x={27} y={64} />
              </g>
            </g>
            {/* legs */}
            <line
              className="sitara-load-leg-a"
              x1="16"
              y1="90"
              x2="16"
              y2="111"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <line
              className="sitara-load-leg-b"
              x1="16"
              y1="90"
              x2="16"
              y2="111"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        </g>
      </g>
    </svg>
  );
}

export const ChatLoadingScreen = memo(({ error }: { error?: string }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (error) {
      return undefined;
    }

    const timer = setInterval(() => setStep((current) => Math.min(current + 1, STEPS.length - 1)), STEP_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [error]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6" role="alert">
        <div className="max-w-md flex flex-col items-center gap-3 text-center">
          <div className="i-ph:package text-5xl text-bolt-elements-textSecondary" />
          <div className="text-lg font-medium text-bolt-elements-textPrimary">We couldn't load this chat</div>
          <div className="text-sm text-bolt-elements-textSecondary break-words">{error}</div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-accent-500 text-white hover:bg-accent-600"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-bolt-elements-borderColor text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2"
              onClick={() => window.location.assign('/')}
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6" role="status" aria-live="polite">
      <div className="w-full max-w-md flex flex-col items-center gap-5 text-center">
        <WorkerScene />
        <div className="flex flex-col gap-1">
          <div key={step} className="text-base font-medium text-bolt-elements-textPrimary sitara-load-fade">
            {STEPS[step]}
          </div>
          <div className="text-xs text-bolt-elements-textTertiary">Bringing your project into the builder</div>
        </div>
      </div>
    </div>
  );
});
