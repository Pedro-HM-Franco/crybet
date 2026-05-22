import { motion } from "framer-motion";
import { useState } from "react";

export function Login({ users, onLogin, onRegister }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [message, setMessage] = useState("");

  function submit(event) {
    event.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setMessage("Digite um nome de usuario.");
      return;
    }

    const existing = users.find((user) => user.username.toLowerCase() === cleanUsername.toLowerCase());

    if (mode === "login") {
      if (!existing) {
        setMessage("Usuario nao encontrado. Cadastre primeiro.");
        return;
      }
      onLogin(existing);
      return;
    }

    if (existing) {
      setMessage("Esse nome ja foi cadastrado. Use Entrar.");
      return;
    }

    onRegister({
      username: cleanUsername,
      avatar: (avatar.trim() || cleanUsername.charAt(0)).slice(0, 2).toUpperCase()
    });
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="noise" />
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-5 py-10">
        <motion.div
          className="panel mx-auto w-full max-w-xl p-6 text-center md:p-10"
          initial={false}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="mono-label">Meme ficticio entre amigos / sem dinheiro / sem apostas reais</p>
          <h1 className="glitch my-5 font-display text-6xl leading-none md:text-8xl">CRYBET</h1>
          <p className="mx-auto max-w-md font-mono text-sm uppercase text-white/70">
            Entre para prever quando Cachinhos vai chorar. As previsoes sao piada, os pontos sao falsos e nada aqui vale dinheiro.
          </p>

          <div className="mt-8 grid grid-cols-2 border border-white/50 font-mono text-xs uppercase">
            <button
              className={`px-3 py-3 ${mode === "login" ? "bg-white text-black" : "bg-black text-white"}`}
              type="button"
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
            >
              Entrar
            </button>
            <button
              className={`px-3 py-3 ${mode === "register" ? "bg-white text-black" : "bg-black text-white"}`}
              type="button"
              onClick={() => {
                setMode("register");
                setMessage("");
              }}
            >
              Cadastrar
            </button>
          </div>

          <form
            className="mt-5 grid gap-4 text-left"
            onSubmit={submit}
          >
            <label className="grid gap-2 font-mono text-xs uppercase">
              Nome de usuario
              <input
                className="input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Nome do analista emocional"
                maxLength={18}
              />
            </label>
            {mode === "register" ? (
              <label className="grid gap-2 font-mono text-xs uppercase">
                Avatar opcional
                <input
                  className="input"
                  value={avatar}
                  onChange={(event) => setAvatar(event.target.value)}
                  placeholder="Iniciais ou alias pixelado"
                  maxLength={2}
                />
              </label>
            ) : null}
            {message ? (
              <p className="border border-white/40 p-3 text-center font-mono text-xs uppercase text-white/70">
                {message}
              </p>
            ) : null}
            <button className="button-primary mt-2" type="submit">
              {mode === "login" ? "Entrar no CRYBET" : "Criar usuario"}
            </button>
          </form>
        </motion.div>
      </section>
    </main>
  );
}
