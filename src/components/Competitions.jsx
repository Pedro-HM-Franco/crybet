import { useMemo, useState } from "react";

function makeOptionId(index) {
  return `option-${index + 1}`;
}

function optionOdds(competition, optionId) {
  const totalBets = Math.max(competition.bets.length, 1);
  const optionBets = competition.bets.filter((bet) => bet.optionId === optionId).length;
  const popularityPenalty = optionBets / totalBets;
  const lonelyBonus = optionBets === 0 ? 1.4 : 0;
  return Number(Math.max(1.2, Math.min(6.5, 2.6 + lonelyBonus - popularityPenalty * 2.8)).toFixed(1));
}

function userBetFor(competition, userId) {
  return competition.bets.find((bet) => bet.userId === userId);
}

export function Competitions({ user, users, competitions, onCreate, onBet, onResolve, onDelete }) {
  const [title, setTitle] = useState("");
  const [rawOptions, setRawOptions] = useState("Pedro termina primeiro\nMaria termina primeiro");
  const [amounts, setAmounts] = useState({});

  const activeCompetitions = useMemo(
    () => competitions.filter((competition) => competition.status === "active"),
    [competitions]
  );
  const resolvedCompetitions = useMemo(
    () => competitions.filter((competition) => competition.status === "resolved").slice(0, 4),
    [competitions]
  );

  function createCompetition(event) {
    event.preventDefault();
    const options = rawOptions
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean)
      .slice(0, 6);

    if (!title.trim() || options.length < 2) return;
    onCreate({
      title: title.trim(),
      options: options.map((label, index) => ({ id: makeOptionId(index), label }))
    });
    setTitle("");
    setRawOptions("Pedro termina primeiro\nMaria termina primeiro");
  }

  return (
    <section className="panel p-5 md:p-6">
      <div className="mb-5">
        <p className="mono-label">Mercados paralelos de zoeira / CRYCOINS ficticios</p>
        <h2 className="section-title">Mini Competições</h2>
        <p className="mt-2 max-w-2xl font-mono text-sm uppercase text-white/60">
          Crie uma aposta de meme tipo “quem termina primeiro?” e deixe a galera escolher uma opção.
        </p>
      </div>

      <form className="grid gap-3 border-b border-white/25 pb-5 lg:grid-cols-[1fr_1fr_auto]" onSubmit={createCompetition}>
        <input
          className="input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex: Quem termina o arquivo primeiro?"
          maxLength={80}
        />
        <textarea
          className="input min-h-24 resize-y"
          value={rawOptions}
          onChange={(event) => setRawOptions(event.target.value)}
          placeholder="Uma opção por linha"
          maxLength={240}
        />
        <button className="button-primary h-fit self-end" type="submit">
          Criar competição
        </button>
      </form>

      <div className="mt-5 space-y-4">
        {!activeCompetitions.length ? (
          <div className="border border-white/30 p-4 font-mono text-xs uppercase text-white/60">
            Nenhuma mini competição ativa.
          </div>
        ) : null}

        {activeCompetitions.map((competition) => {
          const existingBet = userBetFor(competition, user.id);
          return (
            <article key={competition.id} className="border border-white/35 p-4">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="mono-label">Criada por {competition.createdByName}</p>
                  <h3 className="font-display text-2xl uppercase leading-none">{competition.title}</h3>
                </div>
                <span className="border border-white/40 px-3 py-2 font-mono text-xs uppercase">
                  {competition.bets.length} apostas
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {competition.options.map((option) => {
                  const odds = optionOdds(competition, option.id);
                  const optionBets = competition.bets.filter((bet) => bet.optionId === option.id);
                  const amount = Number(amounts[`${competition.id}-${option.id}`] ?? 5);
                  const reward = Math.round(amount * odds);
                  return (
                    <div key={option.id} className="border border-white/25 p-3">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <strong className="font-display text-xl uppercase">{option.label}</strong>
                        <span className="border border-white/50 px-2 py-1 font-display">x{odds}</span>
                      </div>
                      <div className="mb-3 grid gap-1 font-mono text-xs uppercase text-white/60">
                        <span>{optionBets.length} votos</span>
                        <span>Retorno com {amount} CRYCOINS: 🪙 {reward}</span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <input
                          className="input"
                          type="number"
                          min="1"
                          max={user.crycoins ?? 0}
                          value={amount}
                          disabled={Boolean(existingBet)}
                          onChange={(event) =>
                            setAmounts((current) => ({
                              ...current,
                              [`${competition.id}-${option.id}`]: Math.max(1, Number(event.target.value) || 1)
                            }))
                          }
                        />
                        <button
                          className="button-primary"
                          type="button"
                          disabled={Boolean(existingBet) || (user.crycoins ?? 0) < amount}
                          onClick={() => onBet({ competitionId: competition.id, optionId: option.id, amount, odds })}
                        >
                          {existingBet ? "Aposta feita" : "Apostar"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 border-t border-white/25 pt-3">
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-mono text-xs uppercase text-white/60">Encerrar ou apagar competição</p>
                  <button
                    className="border border-white/40 px-3 py-2 font-mono text-xs uppercase transition hover:bg-white hover:text-black"
                    type="button"
                    onClick={() => onDelete(competition.id)}
                  >
                    Apagar competição
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {competition.options.map((option) => (
                    <button
                      key={option.id}
                      className="border border-white/40 px-3 py-2 font-mono text-xs uppercase transition hover:bg-white hover:text-black"
                      type="button"
                      onClick={() => onResolve({ competitionId: competition.id, winningOptionId: option.id })}
                    >
                      Venceu: {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {resolvedCompetitions.length ? (
        <div className="mt-6 border-t border-white/25 pt-5">
          <p className="mono-label mb-3">Historico recente</p>
          <div className="grid gap-3 md:grid-cols-2">
            {resolvedCompetitions.map((competition) => {
              const winner = competition.options.find((option) => option.id === competition.winningOptionId);
              return (
                <article key={competition.id} className="border border-white/25 p-3 font-mono text-xs uppercase">
                  <strong className="block font-display text-xl">{competition.title}</strong>
                  <span className="text-white/60">Vencedor: {winner?.label ?? "indefinido"}</span>
                  <button
                    className="mt-3 block border border-white/40 px-3 py-2 transition hover:bg-white hover:text-black"
                    type="button"
                    onClick={() => onDelete(competition.id)}
                  >
                    Apagar registro
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
