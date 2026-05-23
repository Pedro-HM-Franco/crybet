export const ranks = [
  "Novato",
  "Desafiante",
  "Jogador Elite",
  "Mestre da Arena",
  "Campeão Nexus",
  "Lenda ENFE"
];

export const categories = [
  { id: "active", label: "Ativa", color: "blue" },
  { id: "tournament", label: "Torneio", color: "purple" },
  { id: "challenge", label: "Desafio", color: "green" },
  { id: "volatile", label: "Alta Volatilidade", color: "orange" },
  { id: "finals", label: "Final", color: "red" }
];

export const challengeTypes = [
  { id: "speed", label: "Desafio de Velocidade", color: "blue" },
  { id: "productivity", label: "Produtividade", color: "green" },
  { id: "health", label: "Saúde e Pausas", color: "cyan" },
  { id: "creative", label: "Criativo", color: "purple" },
  { id: "random", label: "Aleatório Divertido", color: "orange" }
];

export const weekendEvents = [
  {
    day: "Sexta",
    title: "Sprint Editorial de Sexta",
    description: "Arquivos finais, revisões urgentes e energia criativa de fim de noite.",
    status: "Em espera"
  },
  {
    day: "Sábado",
    title: "Bloco de Produção de Sábado",
    description: "Tópicos, layouts, banners e assets sendo finalizados em equipe.",
    status: "Aberto"
  },
  {
    day: "Sábado",
    title: "Noitada Criativa de Sábado",
    description: "Competições de entrega, revisão, exportação e sobrevivência editorial.",
    status: "Destaque"
  },
  {
    day: "Domingo",
    title: "Fechamento de Domingo",
    description: "Entrega final, PDFs exportados, apresentações fechadas e ranking consolidado.",
    status: "Finais"
  }
];

export const starterCompetitions = [
  {
    title: "Quem termina o arquivo primeiro?",
    description: "Corrida amigável para ver quem fecha o arquivo atual antes.",
    category: "active",
    challengeType: "speed",
    participants: "Equipe editorial",
    timer: "LIVE",
    reward: 20,
    entryAmount: 5,
    options: ["Pedro termina primeiro", "Maria termina primeiro", "João termina primeiro"]
  },
  {
    title: "Mais tópicos antes da meia-noite",
    description: "Quem completa mais tópicos válidos até o fim do sprint?",
    category: "tournament",
    challengeType: "productivity",
    participants: "Todos os produtores",
    timer: "SAT 21:00",
    reward: 35,
    entryAmount: 8,
    options: ["Pedro", "Maria", "João", "Azarão produtivo"]
  },
  {
    title: "Melhor layout entregue hoje",
    description: "Votação de zoeira para o layout mais bonito do dia.",
    category: "challenge",
    challengeType: "creative",
    participants: "Design squad",
    timer: "SUN 16:00",
    reward: 25,
    entryAmount: 5,
    options: ["Banner", "Apresentação", "Editorial", "Logo rápido"]
  }
];

export function rankFor(user) {
  const wins = user.wins ?? user.correct ?? 0;
  const coins = user.enfecoins ?? user.crycoins ?? 0;
  if (coins >= 500 || wins >= 12) return "Lenda ENFE";
  if (coins >= 300 || wins >= 8) return "Campeão Nexus";
  if (coins >= 200 || wins >= 5) return "Mestre da Arena";
  if (coins >= 120 || wins >= 3) return "Jogador Elite";
  if (wins >= 1) return "Desafiante";
  return "Novato";
}
