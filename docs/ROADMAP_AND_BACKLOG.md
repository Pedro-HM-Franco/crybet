# Ascend - Roadmap e Backlog

## Roadmap

### Fase 0 - Protótipo navegavel

- HUD RPG em dark mode.
- Missoes, XP, atributos, classes, habitos e testemunhos.
- Persistencia local.
- Documentacao de produto e arquitetura.

### Fase 1 - MVP SaaS

- Auth real.
- Perfil do jogador.
- Banco PostgreSQL.
- CRUD de missoes e habitos.
- Conclusao de missoes com XP real.
- IA Sistema gerando mensagens e missoes.
- Notificacoes diarias.

### Fase 2 - Mobile e comunidade

- App React Native.
- Guildas.
- Amigos.
- Ranking semanal.
- Desafios em grupo.
- Compartilhamento de conquistas.

### Fase 3 - Produto premium

- Arvores de skills completas.
- Planos espirituais e fisicos personalizados.
- Analytics de evolucao.
- Marketplace de jornadas.
- Painel para lideres, mentores e igrejas.

### Fase 4 - Escala

- Sistema anti-abuso.
- Eventos e filas.
- Leaderboards otimizados.
- Feature flags de balanceamento.
- Internacionalizacao.

## Backlog estilo Jira

### EPIC ASC-001 - Player Profile

- ASC-101: Como usuario, quero criar minha conta para salvar minha evolucao.
- ASC-102: Como usuario, quero editar meu nome, avatar e classe.
- ASC-103: Como usuario, quero ver meu nivel, rank, XP e moedas.
- ASC-104: Como usuario, quero ver atributos com historico de evolucao.

### EPIC ASC-002 - Missions

- ASC-201: Como usuario, quero receber missoes diarias automaticamente.
- ASC-202: Como usuario, quero criar missoes manuais.
- ASC-203: Como usuario, quero concluir missoes e receber XP.
- ASC-204: Como usuario, quero receber missoes surpresa.
- ASC-205: Como usuario, quero ver missoes por categoria e prazo.

### EPIC ASC-003 - Habits

- ASC-301: Como usuario, quero registrar habitos diarios.
- ASC-302: Como usuario, quero ver minha streak.
- ASC-303: Como usuario, quero receber penalidade leve por abandono.
- ASC-304: Como usuario, quero ativar multiplicador de consistencia.

### EPIC ASC-004 - Classes and Skills

- ASC-401: Como usuario, quero escolher uma classe inicial.
- ASC-402: Como usuario, quero receber buffs por classe.
- ASC-403: Como usuario, quero desbloquear skills por nivel.
- ASC-404: Como usuario, quero trocar classe com custo ou cooldown.

### EPIC ASC-005 - Spiritual System

- ASC-501: Como usuario, quero registrar devocional e oracao.
- ASC-502: Como usuario, quero seguir um plano de leitura biblica.
- ASC-503: Como usuario, quero registrar testemunhos.
- ASC-504: Como lider, quero acompanhar um discipulo.

### EPIC ASC-006 - Social and Guilds

- ASC-601: Como usuario, quero adicionar amigos.
- ASC-602: Como usuario, quero criar ou entrar em guilda.
- ASC-603: Como guilda, queremos desafios semanais.
- ASC-604: Como usuario, quero compartilhar conquistas.

### EPIC ASC-007 - AI System

- ASC-701: Como usuario, quero receber mensagens do Sistema.
- ASC-702: Como usuario, quero que a IA analise minha evolucao.
- ASC-703: Como usuario, quero que a IA crie desafios personalizados.
- ASC-704: Como produto, quero limites, logs e seguranca nas respostas da IA.

### EPIC ASC-008 - Monetization

- ASC-801: Como usuario, quero assinar plano Pro.
- ASC-802: Como guilda, quero um plano para equipes.
- ASC-803: Como usuario Pro, quero temas e cards premium.
- ASC-804: Como admin, quero controlar limites de recursos.

## Wireframes textuais

### HUD

```text
[Sidebar: Avatar, Nivel, XP, Rank, Classe]
[Topbar: Missao ativa + Botao missao surpresa]
[Console IA: mensagem do Sistema]
[Atributos 10x]
[Cards: Hoje, Moedas, Streak]
```

### Missoes

```text
[Formulario novo contrato] [Lista de missoes abertas]
                           [Concluir] [XP] [Atributo] [Dificuldade]
```

### Espiritual

```text
[Plano devocional] [Registro de testemunho]
[Linha do tempo de testemunhos]
```
