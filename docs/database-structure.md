# Estrutura de Banco do CRYBET

CRYBET e apenas satira. Estas tabelas guardam atividade ficticia entre amigos, nao apostas, nao dinheiro e nada com valor financeiro.

## Tabelas Sugeridas no Supabase

### users

| coluna | tipo | observacoes |
| --- | --- | --- |
| id | uuid primary key | gerado pelo Supabase |
| username | text unique | login simples de exibicao |
| avatar | text | iniciais ou pequeno rotulo de avatar |
| correct | integer | contagem ficticia de previsoes corretas |
| wrong | integer | contagem ficticia de previsoes erradas |
| favorite_period | text | morning, afternoon, night, dawn |
| score | integer | pontuacao ficticia do ranking |
| title | text | titulo falso de analista emocional |
| active | boolean | exibicao online |
| created_at | timestamp | default now() |

### predictions

| coluna | tipo | observacoes |
| --- | --- | --- |
| id | uuid primary key | gerado pelo Supabase |
| user_id | uuid references users(id) | dono |
| period | text | morning, afternoon, night, dawn |
| confidence | integer | confianca falsa de 0-100 |
| placed_at | timestamp | default now() |
| prediction_day | date | garante uma previsao por dia |

Adicione um indice unico em `(user_id, prediction_day)`.

### triggers

| coluna | tipo | observacoes |
| --- | --- | --- |
| id | uuid primary key | gerado pelo Supabase |
| user_id | uuid references users(id) | quem ativou |
| label | text | nome do gatilho |
| probability_delta | integer | impacto no modelo local |
| created_at | timestamp | default now() |

### incidents

| coluna | tipo | observacoes |
| --- | --- | --- |
| id | uuid primary key | gerado pelo Supabase |
| cause | text | relatorio ficticio da causa |
| happened_at | timestamp | horario do evento |
| duration | text | valor amigavel para exibicao |
| severity | text | Nivel 1-5 |
| created_by | uuid references users(id) | quem reportou |
| created_at | timestamp | default now() |

### activity_feed

| coluna | tipo | observacoes |
| --- | --- | --- |
| id | uuid primary key | gerado pelo Supabase |
| message | text | linha dramatica do feed |
| type | text | prediction, trigger, incident, warning |
| created_at | timestamp | default now() |

## Supabase Realtime

Ative realtime em `predictions`, `triggers`, `incidents` e `activity_feed`.

O app roda atualmente no modo `local-demo` com `localStorage`. Adicione estas variaveis de ambiente para ativar o cliente Supabase:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```
