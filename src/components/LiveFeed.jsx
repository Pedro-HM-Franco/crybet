import { motion, AnimatePresence } from "framer-motion";

export function LiveFeed({ feed }) {
  return (
    <section className="section-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="eyebrow">Feed social em tempo real</p>
          <h2>Feed Ao Vivo</h2>
        </div>
        <span className="live-badge">LIVE</span>
      </div>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {feed.slice(0, 8).map((item, index) => (
            <motion.div
              key={`${item}-${index}`}
              className="feed-row"
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{item}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
