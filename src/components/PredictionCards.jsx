import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { periods } from "../data/periods";
import { periodRisk } from "../lib/market";

export function PredictionCards({ predictions, selected, onSelect, locked, odds, balance, probability }) {
  const [draftPeriod, setDraftPeriod] = useState(selected ?? "friday-night");
  const [amount, setAmount] = useState(10);
  const total = Math.max(predictions.length, 1);
  const selectedOdd = odds[draftPeriod] ?? 1;
  const potentialReward = useMemo(() => Math.round(Number(amount || 0) * selectedOdd), [amount, selectedOdd]);
  const groups = [
    { id: "FRIDAY", label: "FRIDAY", helper: "Sexta feira" },
    { id: "SATURDAY", label: "SATURDAY", helper: "Sabado" },
    { id: "SUNDAY", label: "SUNDAY", helper: "Domingo" }
  ];

  function safeAmount(value) {
    return Math.max(1, Math.min(balance, Number(value) || 1));
  }

  return (
    <section className="panel p-5 md:p-7">
      <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="mono-label">Evento de fim de semana / uma previsao ativa</p>
          <h2 className="section-title">Quando a Cachinhos vai chorar no fim de semana?</h2>
          <p className="mt-2 max-w-2xl font-mono text-sm uppercase text-white/60">
            Escolha um periodo especifico, defina seus CRYCOINS ficticios e confirme. Nao existe dinheiro real aqui.
          </p>
        </div>
        <div className="border border-white/40 p-3 text-right font-mono text-xs uppercase">
          <p>Saldo disponivel</p>
          <strong className="font-display text-3xl">🪙 {balance}</strong>
          <p>CRYCOINS</p>
        </div>
      </div>
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.id} className="border-t border-white/20 pt-4">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl uppercase leading-none">{group.label}</h3>
                <p className="font-mono text-xs uppercase text-white/50">{group.helper}</p>
              </div>
              <span className="font-mono text-xs uppercase text-white/50">
                {periods.filter((period) => period.day === group.id).length} janelas
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {periods
                .filter((period) => period.day === group.id)
                .map((period) => {
                  const votes = predictions.filter((prediction) => prediction.period === period.id).length;
                  const percent = Math.round((votes / total) * 100);
                  const active = draftPeriod === period.id;
                  const odd = odds[period.id] ?? 1;
                  const risk = periodRisk({ periodId: period.id, probability, odds });

                  return (
                    <motion.button
                      key={period.id}
                      type="button"
                      disabled={locked}
                      onClick={() => setDraftPeriod(period.id)}
                      className={`prediction-card ${active ? "selected" : ""} ${locked && !active ? "opacity-45" : ""}`}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-mono text-3xl uppercase text-white/90">{period.icon}</span>
                        <span className="border border-white/50 px-2 py-1 font-display text-xl">x{odd}</span>
                      </div>
                      <span className="mt-4 block font-mono text-xs uppercase text-white/50">{period.dayLabel}</span>
                      <strong className="mt-1 block font-display text-2xl uppercase">{period.displayLabel}</strong>
                      <span className="mt-1 block font-mono text-xs text-white/60">{period.window}</span>
                      <div className="mt-5 h-2 border border-white/50">
                        <div className="h-full bg-white transition-all" style={{ width: `${percent}%` }} />
                      </div>
                      <div className="mt-3 grid gap-1 font-mono text-xs uppercase text-white/70">
                        <span>{votes} votos</span>
                        <span>{percent}% do mercado</span>
                        <span>Risco emocional: {risk}</span>
                        <span>Com {amount} CRYCOINS: 🪙 {Math.round(amount * odd)}</span>
                      </div>
                    </motion.button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 border-t border-white/25 pt-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="grid gap-2 font-mono text-xs uppercase">
          CRYCOINS ficticios nesta previsao
          <input
            className="input max-w-xs"
            type="number"
            min="1"
            max={balance}
            value={amount}
            disabled={locked || balance <= 0}
            onChange={(event) => setAmount(safeAmount(event.target.value))}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
          <div className="border border-white/30 p-3 font-mono text-xs uppercase">
            <p>Periodo</p>
            <strong className="font-display text-2xl">{periods.find((period) => period.id === draftPeriod)?.label}</strong>
          </div>
          <div className="border border-white/30 p-3 font-mono text-xs uppercase">
            <p>Retorno potencial</p>
            <strong className="font-display text-2xl">🪙 {potentialReward}</strong>
          </div>
          <button
            className="button-primary"
            type="button"
            disabled={locked || balance <= 0}
            onClick={() => onSelect({ period: draftPeriod, amount: safeAmount(amount), odds: selectedOdd })}
          >
            {locked ? "Previsao travada" : "Confirmar previsao"}
          </button>
        </div>
      </div>
    </section>
  );
}
