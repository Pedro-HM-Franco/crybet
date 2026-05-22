import { useMemo, useState } from "react";

function timeLabel(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function ChatPanel({ user, users, messages, onSend }) {
  const [mode, setMode] = useState("global");
  const [recipientId, setRecipientId] = useState("");
  const [text, setText] = useState("");

  const availableUsers = users.filter((item) => item.id !== user.id);
  const visibleMessages = useMemo(() => {
    return messages
      .filter((message) => {
        if (mode === "global") return message.type === "global";
        return (
          message.type === "private" &&
          ((message.fromId === user.id && message.toId === recipientId) ||
            (message.fromId === recipientId && message.toId === user.id))
        );
      })
      .slice(-40);
  }, [messages, mode, recipientId, user.id]);

  function submit(event) {
    event.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    if (mode === "private" && !recipientId) return;

    onSend({
      type: mode,
      toId: mode === "private" ? recipientId : null,
      text: clean
    });
    setText("");
  }

  return (
    <section className="panel p-5 md:p-6">
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="mono-label">Comunicacao do mercado emocional</p>
          <h2 className="section-title">Chat CRYBET</h2>
        </div>
        <div className="grid grid-cols-2 border border-white/50 font-mono text-xs uppercase">
          <button
            className={`px-4 py-2 ${mode === "global" ? "bg-white text-black" : "bg-black text-white"}`}
            type="button"
            onClick={() => setMode("global")}
          >
            Geral
          </button>
          <button
            className={`px-4 py-2 ${mode === "private" ? "bg-white text-black" : "bg-black text-white"}`}
            type="button"
            onClick={() => setMode("private")}
          >
            Privado
          </button>
        </div>
      </div>

      {mode === "private" ? (
        <label className="mb-4 grid gap-2 font-mono text-xs uppercase">
          Escolher usuario
          <select className="input" value={recipientId} onChange={(event) => setRecipientId(event.target.value)}>
            <option value="">Selecione alguem</option>
            {availableUsers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.username} {item.active ? "(online)" : "(offline)"}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="chat-window">
        {!visibleMessages.length ? (
          <p className="p-4 text-center font-mono text-xs uppercase text-white/50">
            {mode === "global" ? "Nenhuma mensagem geral ainda." : "Nenhuma conversa privada selecionada."}
          </p>
        ) : null}
        {visibleMessages.map((message) => {
          const mine = message.fromId === user.id;
          return (
            <article key={message.id} className={`chat-message ${mine ? "mine" : ""}`}>
              <div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase text-white/50">
                <span>{message.fromName}</span>
                <span>{timeLabel(message.createdAt)}</span>
              </div>
              <p className="mt-1 font-mono text-sm text-white/90">{message.text}</p>
            </article>
          );
        })}
      </div>

      <form className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={submit}>
        <input
          className="input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={mode === "global" ? "Mensagem para o chat geral" : "Mensagem privada"}
          maxLength={240}
        />
        <button className="button-primary" type="submit" disabled={mode === "private" && !recipientId}>
          Enviar
        </button>
      </form>
    </section>
  );
}
