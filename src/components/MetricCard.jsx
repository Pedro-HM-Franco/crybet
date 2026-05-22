import { motion } from "framer-motion";

export function MetricCard({ label, value, detail, intense = false }) {
  return (
    <motion.article
      className={`metric-card ${intense ? "hot" : ""}`}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="scanline" />
      <p className="mono-label">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <strong className="font-display text-3xl leading-none md:text-4xl">{value}</strong>
        {detail ? <span className="text-right font-mono text-xs uppercase text-white/60">{detail}</span> : null}
      </div>
    </motion.article>
  );
}
