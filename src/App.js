import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import PizzaShader from "./PizzaShader";
import pizzaUrl from "./pizza.png";
import "./styles.css";

const CM_PER_PIECE = 25 / 6; // 6 pieces per 25cm
const MENU_URL = "https://www.arrivedercipizza.com.au/menu";

// Slice ranges: 0 | 1 | 2–3 | 4–5 | 6+
const TIER_SHADER = ["vhsgrey", "vhs", "pulse", "drift", "kaleido"];
const ECHO_COLORS = ["#6b1fb1", "#19e3ff", "#ffc94a", "#ff8c1a", "#ff2e88"];
// 6+ echo trail: 10 outlines cycling the palette twice
const ECHOES = [...ECHO_COLORS, ...ECHO_COLORS];
// Pizza echo trail grows with the slice range: copies shown and swing scale.
const PZ_COUNT = [2, 3, 5, 7, 10];
const PZ_TRAVEL = [0.25, 0.4, 0.6, 0.8, 1];
const EXTRUDE = ["#c2186b", "#9b1a8f", "#6b1fb1", "#56147a", "#3d0f57", "#2a0b3d", "#1f0830", "#19e3ff", "#0f0614", "#14081a"];
const HALO = [
  { c: "#19e3ff", w0: 12, w1: 20 },
  { c: "#6b1fb1", w0: 8, w1: 13 },
  { c: "#fff6dc", w0: 4, w1: 7 },
];

function tierFor(slices) {
  if (slices <= 0) return 0;
  if (slices === 1) return 1;
  if (slices <= 3) return 2;
  if (slices <= 5) return 3;
  return 4;
}

function feedback(people, slices) {
  if (people <= 0) return "Zero people… no friends?";
  if (slices <= 0) return "Disgraceful";
  if (slices === 1) return "I'm not angry, just disappointed";
  if (slices === 2) return "Got to bump those numbers up, those are rookie numbers";
  if (slices === 3) return "Respectable. Barely.";
  if (slices <= 5) return "Now that's a proper feed";
  if (slices === 6) return "So, you're hungry then";
  return "Certified god-tier pizza lover";
}

const echoStyle = (j) => {
  const d = ECHOES.length - j;
  return { opacity: 1 - d * 0.06, animationDelay: `${d * 0.12}s` };
};

// Hollow outline copies that trail around a box-shaped element (6+ only).
function BoxEchoes() {
  return ECHOES.map((c, j) => (
    <span key={j} className="echo" aria-hidden="true" style={{ ...echoStyle(j), borderColor: c }} />
  ));
}

// Hollow outline copies of a piece of text (6+ only).
function TextEchoes({ children, block = false }) {
  return ECHOES.map((c, j) => (
    <span
      key={j}
      className={block ? "echo-tb" : "echo-t"}
      aria-hidden="true"
      style={{ ...echoStyle(j), WebkitTextStrokeColor: c }}
    >
      {children}
    </span>
  ));
}

function Title({ hotline }) {
  const words = (
    <>
      <span>Derci</span>
      <span className="calc-pad">Calc</span>
    </>
  );
  if (!hotline) {
    return (
      <h1 className="title">
        <span className="derci">Derci</span>
        <span className="calc">Calc</span>
      </h1>
    );
  }
  // 6+: swinging extrusion orbiting the word, plus three breathing outlines.
  return (
    <h1 className="title title-hotline" aria-label="DerciCalc">
      <div className="title-stack">
        <span className="title-size" aria-hidden="true">{words}</span>
        {EXTRUDE.map((c, i) => {
          const d = EXTRUDE.length - i;
          return (
            <div
              key={d}
              className="xw"
              aria-hidden="true"
              style={{ "--k": d, animationDelay: `-${(6 - d * 0.08).toFixed(2)}s` }}
            >
              <span className="xt" style={{ color: EXTRUDE[d - 1], animationDelay: `-${(2.6 - d * 0.07).toFixed(2)}s` }}>
                {words}
              </span>
            </div>
          );
        })}
        {HALO.map((r, i) => (
          <div key={r.c} className="xw-static" aria-hidden="true">
            <span
              className="xtr"
              style={{
                color: r.c,
                WebkitTextStrokeColor: r.c,
                WebkitTextStrokeWidth: `${r.w0}px`,
                "--w0": `${r.w0}px`,
                "--w1": `${r.w1}px`,
                animationDelay: `0s, -${(i * 0.3).toFixed(1)}s`,
              }}
            >
              {words}
            </span>
          </div>
        ))}
        <div className="xw-static" aria-hidden="true">
          <span className="xt">
            <span className="derci">Derci</span>
            <span className="calc">Calc</span>
          </span>
        </div>
      </div>
    </h1>
  );
}

// 4–5: liquid marbled rainbow inside the order number (letter shapes untouched).
function LiquidFill({ value, baseline }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className="liquid" aria-hidden="true" width="100%" height="100%">
      <defs>
        <clipPath id={`${id}c`}>
          <text x="0" y={baseline} className="liquid-text">
            <tspan>{value}</tspan>
            <tspan dx="6" className="liquid-unit">cm</tspan>
          </text>
        </clipPath>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b04cff" />
          <stop offset="0.2" stopColor="#ff8c1a" />
          <stop offset="0.4" stopColor="#ff2e88" />
          <stop offset="0.6" stopColor="#19e3ff" />
          <stop offset="0.8" stopColor="#ffc94a" />
          <stop offset="1" stopColor="#b04cff" />
          <animateTransform attributeName="gradientTransform" type="rotate" from="0 0.5 0.5" to="360 0.5 0.5" dur="9s" repeatCount="indefinite" />
        </linearGradient>
        <filter id={`${id}f`} x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.05" numOctaves="2" seed="3" result="noise">
            <animate attributeName="baseFrequency" dur="10s" values="0.02 0.05;0.04 0.025;0.02 0.05" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="45" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <g filter={`url(#${id}f)`}>
          <rect x="-20%" y="-50%" width="140%" height="200%" fill={`url(#${id}g)`} />
          <circle cx="20%" cy="30%" r="28" fill="#ff2e88" opacity="0.85">
            <animate attributeName="cx" dur="6s" values="10%;80%;30%;10%" repeatCount="indefinite" />
          </circle>
          <circle cx="70%" cy="70%" r="24" fill="#19e3ff" opacity="0.85">
            <animate attributeName="cy" dur="5s" values="80%;10%;60%;80%" repeatCount="indefinite" />
          </circle>
          <circle cx="45%" cy="50%" r="20" fill="#ffc94a" opacity="0.8">
            <animate attributeName="cx" dur="7s" values="60%;15%;90%;60%" repeatCount="indefinite" />
          </circle>
        </g>
      </g>
    </svg>
  );
}

function Stepper({ id, label, value, onChange, onDec, onInc, decLabel, incLabel, hotline }) {
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="stepper">
        <button type="button" className="step step-minus" aria-label={decLabel} onClick={onDec}>
          {hotline && <BoxEchoes />}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h14" />
          </svg>
        </button>
        <div className="num-wrap">
          {hotline && <BoxEchoes />}
          <input
            id={id}
            className="num"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={value}
            onChange={onChange}
          />
        </div>
        <button type="button" className="step step-plus" aria-label={incLabel} onClick={onInc}>
          {hotline && <BoxEchoes />}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h14M12 5v14" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Disclaimer({ onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    if (closeRef.current) closeRef.current.focus();
    return () => {
      if (prev && prev.focus) prev.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disc-h"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <h2 id="disc-h">Disclaimer</h2>
        <p>
          DerciCalc is an independent, fan-made calculator. It is not affiliated with, endorsed by or
          connected to Arrivederci Pizzeria in any way.
        </p>
        <button ref={closeRef} type="button" className="modal-close" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}

const clean = (v) => String(v).replace(/[^0-9]/g, "").slice(0, 3);

export default function App() {
  const [people, setPeople] = useState("8");
  const [slices, setSlices] = useState("3");
  const [showDisc, setShowDisc] = useState(false);
  const [baseline, setBaseline] = useState(52);
  const numRef = useRef(null);
  const baseRef = useRef(null);

  const p = parseInt(people, 10) || 0;
  const s = parseInt(slices, 10) || 0;
  const reqCm = Math.round(CM_PER_PIECE * p * s);
  const minCm = Math.ceil(reqCm / 25) * 25;
  const leftover = Math.round((minCm - reqCm) / CM_PER_PIECE);
  const msg = feedback(p, s);

  const tier = tierFor(s);
  const hotline = tier === 4;
  const liquid = tier === 3;

  const step = (value, set, d) => () => set(String(Math.max(0, Math.min(999, (parseInt(value, 10) || 0) + d))));

  // Line up the liquid layer with the real number's baseline.
  useLayoutEffect(() => {
    if (!liquid) return undefined;
    const measure = () => {
      if (baseRef.current) setBaseline(baseRef.current.offsetTop);
    };
    measure();
    let cancelled = false;
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) measure();
      });
    }
    window.addEventListener("resize", measure);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", measure);
    };
  }, [liquid, minCm]);

  useEffect(() => {
    document.body.dataset.theme = hotline ? "neon" : "pizza";
  }, [hotline]);

  const numClass = ["order-num", tier === 2 && "beat-num", liquid && "rainbow-num beat-num4"].filter(Boolean).join(" ");

  return (
    <div className={`app tier-${tier} ${hotline ? "theme-neon" : "theme-pizza"}`}>
      <PizzaShader mode={TIER_SHADER[tier]} intensity={0.75} speed={0.8} />

      <main className="main">
        <header className="header">
          <div className={`vib vib-${tier}`} aria-hidden="true" style={{ "--et": PZ_TRAVEL[tier] }}>
            {ECHOES.map((c, j) =>
              j < ECHOES.length - PZ_COUNT[tier] ? null : (
                <div key={j} className="pz-echo" style={{ ...echoStyle(j), background: c }} />
              )
            )}
            <img className={`pizza ${liquid ? "beat-pz" : ""}`} src={pizzaUrl} alt="" />
          </div>
          <Title hotline={hotline} />
        </header>

        <section className={`card ${hotline ? "beat-card" : ""}`} aria-label="Your order">
          <Stepper
            id="people"
            label="People eating"
            value={people}
            onChange={(e) => setPeople(clean(e.target.value))}
            onDec={step(people, setPeople, -1)}
            onInc={step(people, setPeople, 1)}
            decLabel="One less person"
            incLabel="One more person"
            hotline={hotline}
          />
          <div className="field">
            <Stepper
              id="slices"
              label="Slices each"
              value={slices}
              onChange={(e) => setSlices(clean(e.target.value))}
              onDec={step(slices, setSlices, -1)}
              onInc={step(slices, setSlices, 1)}
              decLabel="One less slice"
              incLabel="One more slice"
              hotline={hotline}
            />
            <div className="chips" role="group" aria-label="Quick pick slices">
              {[2, 3, 4, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`chip ${s === n ? "is-on" : ""}`}
                  aria-pressed={s === n}
                  onClick={() => setSlices(String(n))}
                >
                  {hotline && <BoxEchoes />}
                  {n}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={`result ${hotline ? "beat-bar" : ""}`} aria-live="polite" aria-label="Result">
          <div className="result-top">
            <span className="result-label">Order</span>
            <span className="result-boards">{minCm / 25} × 25 cm</span>
          </div>
          <div ref={numRef} className={numClass}>
            {minCm}
            <span className="unit">cm</span>
            {hotline && (
              <TextEchoes>
                {minCm}
                <span className="unit">cm</span>
              </TextEchoes>
            )}
            <span ref={baseRef} className="baseline-probe" />
            {liquid && <LiquidFill value={minCm} baseline={baseline} />}
          </div>
          <div className="stats">
            <div className="stat">
              <span className="stat-label">Needed</span>
              <span className="stat-value">
                {reqCm} cm
                {hotline && <TextEchoes>{reqCm} cm</TextEchoes>}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Spare slices</span>
              <span className="stat-value">
                {leftover}
                {hotline && <TextEchoes>{leftover}</TextEchoes>}
              </span>
            </div>
          </div>
        </section>

        <div className="bubble-wrap">
          <p className={`bubble ${hotline ? "beat-off" : ""}`}>
            {hotline && <TextEchoes block>{msg}</TextEchoes>}
            {msg}
          </p>
        </div>

        <nav className="links" aria-label="Links">
          <a className="pill" href={MENU_URL} target="_blank" rel="noopener noreferrer">
            <span className="pill-inner">
              Arrivederci menu
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 4h6v6M20 4l-10 10M18 14v6H4V6h6" />
              </svg>
            </span>
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <button type="button" className="pill" onClick={() => setShowDisc(true)}>
            <span className="pill-inner">Disclaimer</span>
          </button>
        </nav>
      </main>

      {showDisc && <Disclaimer onClose={() => setShowDisc(false)} />}
    </div>
  );
}
