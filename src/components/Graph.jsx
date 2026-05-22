import { motion } from "framer-motion";

export function Graph({ data }) {
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - value;
    return `${x},${y}`;
  });

  return (
    <section className="panel p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="mono-label">Grafico falso do mercado emocional da Cachinhos</p>
          <h2 className="section-title">Volatilidade CACH/CRY</h2>
        </div>
        <span className="blink border border-white px-2 py-1 font-mono text-xs">LIVE</span>
      </div>

      <div className="relative h-64 overflow-hidden border border-white/40 bg-black">
        <div className="grid-bg absolute inset-0 opacity-50" />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <polyline
            points={points.join(" ")}
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={`0,100 ${points.join(" ")} 100,100`}
            fill="rgba(255,255,255,.08)"
            stroke="none"
          />
        </svg>
        {data.map((value, index) => (
          <motion.div
            key={`${value}-${index}`}
            className="absolute bottom-0 w-1 bg-white"
            style={{ left: `${(index / data.length) * 100}%`, height: `${value}%` }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.4, delay: index * 0.03 }}
          />
        ))}
        <div className="absolute left-4 top-4 font-mono text-xs uppercase text-white/70">
          SENTIMENTO IA: INSTAVEL
        </div>
      </div>
    </section>
  );
}
