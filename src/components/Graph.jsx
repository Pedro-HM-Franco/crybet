import { motion } from "framer-motion";

export function Graph({ data }) {
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - value;
    return `${x},${y}`;
  });

  return (
    <section className="market-graph">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="eyebrow">Realtime odds movement</p>
          <h2>ENFE Market Index</h2>
        </div>
        <span className="live-badge">LIVE</span>
      </div>

      <div className="graph-canvas">
        <div className="grid-bg absolute inset-0 opacity-50" />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <polyline
            points={points.join(" ")}
            fill="none"
            stroke="#68e8ff"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={`0,100 ${points.join(" ")} 100,100`}
            fill="rgba(104,232,255,.1)"
            stroke="none"
          />
        </svg>
        {data.map((value, index) => (
          <motion.div
            key={`${value}-${index}`}
            className="absolute bottom-0 w-1 bg-cyan-300/80"
            style={{ left: `${(index / data.length) * 100}%`, height: `${value}%` }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.4, delay: index * 0.03 }}
          />
        ))}
        <div className="absolute left-4 top-4 font-mono text-xs uppercase text-white/70">
          MARKET AI: VOLATILE BUT FUN
        </div>
      </div>
    </section>
  );
}
