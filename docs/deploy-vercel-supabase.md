# Deploy CRYBET na Vercel com Supabase

## 1. Criar projeto no Supabase

1. Crie um projeto no Supabase.
2. Abra `SQL Editor`.
3. Cole e execute o arquivo `docs/supabase-setup.sql`.
4. Vá em `Project Settings` -> `API`.
5. Copie:
   - Project URL
   - anon public key

## 2. Configurar variaveis locais

Crie um arquivo `.env.local` na raiz do projeto:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Depois rode:

```bash
npm run dev
```

Se as variaveis estiverem certas, o topo do site mostra `Modo: supabase`.

## 3. Subir para GitHub

```bash
git init
git add .
git commit -m "Create CRYBET"
```

Crie um repositorio no GitHub e envie o projeto.

## 4. Deploy na Vercel

1. Abra a Vercel.
2. Clique em `Add New` -> `Project`.
3. Importe o repositorio do GitHub.
4. Framework: Vite.
5. Build command: `npm run build`.
6. Output directory: `dist`.
7. Em Environment Variables, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
8. Clique em Deploy.

## Observacao de seguranca

Esse setup permite que qualquer visitante leia e atualize o estado do meme usando a anon key. Para um app serio isso nao seria suficiente, mas para esse painel privado/ficticio entre amigos deixa o fluxo simples. Se voce quiser travar por senha, login real ou convite, o proximo passo e usar Supabase Auth e politicas RLS por usuario.
