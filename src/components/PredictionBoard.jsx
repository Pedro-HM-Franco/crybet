import { motion, AnimatePresence } from "framer-motion";
import { periods } from "../data/periods";

function periodLabel(id) {
  const period = periods.find((item) => item.id === id);
  return period ? `${period.label.toUpperCase()} ${period.icon}` : "PERIODO DESCONHECIDO";
}

function periodIcon(id) {
  return periods.find((period) => period.id === id)?.icon ?? "◇";
}

export function PredictionBoard({ users, predictions }) {
  const rows = users.map((user) => ({
    user,
    prediction: predictions.find((item) => item.userId === user.id)
  }));

  return (
    <section className="panel p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="mono-label">Quem apostou em qual periodo, sem dinheiro e sem apostas reais</p>
          <h2 className="section-title">WHO BET WHAT</h2>
        </div>
        <span className="font-mono text-xs uppercase text-white/60">{users.filter((user) => user.active).length} online</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {!rows.length ? (
          <div className="border border-white/30 p-4 font-mono text-xs uppercase text-white/60 lg:col-span-2">
            Ninguem entrou ainda. Os palpites vao aparecer aqui em tempo real.
          </div>
        ) : null}
        <AnimatePresence>
          {rows.map(({ user, prediction }) => (
            <motion.article
              key={user.id}
              className={`flex items-center gap-3 border p-3 ${
                prediction?.previouslyCorrect ? "border-white bg-white text-black" : "border-white/40 bg-black"
              }`}
              initial={false}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <div
                className={`grid h-12 w-12 place-items-center border font-display text-xl ${
                  prediction?.previouslyCorrect ? "border-black" : "border-white"
                }`}
              >
                {prediction ? periodIcon(prediction.period) : user.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-xl uppercase leading-none">{user.username}</h3>
                <p className="mt-1 font-mono text-xs uppercase">
                  Previsao: {prediction ? periodLabel(prediction.period) : "AGUARDANDO PALPITE"} / Confianca:{" "}
                  {prediction ? `${prediction.confidence}%` : "--"}
                </p>
                <p className="font-mono text-xs uppercase opacity-70">
                  Aposta: {prediction ? `${prediction.amount} CRYCOINS` : "--"} / Odds:{" "}
                  {prediction ? `x${prediction.odds}` : "--"}
                </p>
                <p className="font-mono text-xs uppercase opacity-70">
                  Cargo: {prediction?.rank ?? user.title} / {prediction?.placedAt ?? "sem horario"}
                </p>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
