import { motion } from "framer-motion";
import { triggers } from "../data/periods";

export function Triggers({ activeTriggers, onTrigger }) {
  return (
    <section className="panel p-4 md:p-5">
      <div className="mb-4">
        <p className="mono-label">Eventos manuais do mercado emocional</p>
        <h2 className="section-title">Gatilhos Emocionais</h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {triggers.map((trigger) => {
          const active = activeTriggers.includes(trigger);
          return (
            <motion.button
              key={trigger}
              type="button"
              onClick={() => onTrigger(trigger)}
              className={`trigger ${active ? "active" : ""}`}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>{active ? "ATIVO" : "ARMAR"}</span>
              {trigger}
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
