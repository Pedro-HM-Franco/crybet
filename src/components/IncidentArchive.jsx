import { useState } from "react";
import { motion } from "framer-motion";
import { periods } from "../data/periods";

export function IncidentArchive({ incidents, onRegister }) {
  const [form, setForm] = useState({
    cause: "",
    time: "",
    duration: "",
    severity: "Nivel 3",
    period: "friday-night"
  });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="panel p-4 md:p-5">
      <div className="mb-4">
          <p className="mono-label">Relatorios de eventos de choro</p>
          <h2 className="section-title">Arquivo de Incidentes Emocionais</h2>
      </div>

      <form
        className="grid gap-3 md:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.cause.trim()) return;
          onRegister(form);
          setForm({ cause: "", time: "", duration: "", severity: "Nivel 3", period: "friday-night" });
        }}
      >
        <input className="input md:col-span-2" value={form.cause} onChange={(e) => update("cause", e.target.value)} placeholder="O que causou?" />
        <input className="input" value={form.time} onChange={(e) => update("time", e.target.value)} placeholder="Horario" />
        <input className="input" value={form.duration} onChange={(e) => update("duration", e.target.value)} placeholder="Duracao" />
        <select className="input" value={form.severity} onChange={(e) => update("severity", e.target.value)}>
          <option>Nivel 1</option>
          <option>Nivel 2</option>
          <option>Nivel 3</option>
          <option>Nivel 4</option>
          <option>Nivel 5</option>
        </select>
        <select className="input md:col-span-2" value={form.period} onChange={(e) => update("period", e.target.value)}>
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              Periodo vencedor: {period.label} {period.icon}
            </option>
          ))}
        </select>
        <button className="button-primary md:col-span-2" type="submit">
          Registrar Incidente Classificado
        </button>
      </form>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {incidents.map((incident) => (
          <motion.article
            key={incident.id}
            className="classified"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="font-mono text-xs uppercase text-white/50">{incident.createdAt}</p>
            <h3 className="mt-2 font-display text-2xl uppercase">{incident.severity}</h3>
            <p className="mt-2 font-mono text-sm text-white/80">{incident.cause}</p>
            <div className="mt-4 flex justify-between border-t border-white/30 pt-3 font-mono text-xs uppercase">
              <span>{incident.time || "Horario desconhecido"}</span>
              <span>{incident.duration || "Duracao desconhecida"}</span>
            </div>
            {incident.period ? (
              <p className="mt-3 font-mono text-xs uppercase text-white/60">
                Periodo confirmado: {periods.find((period) => period.id === incident.period)?.label}
              </p>
            ) : null}
          </motion.article>
        ))}
      </div>
    </section>
  );
}
