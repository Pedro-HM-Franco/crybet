# Deploy do Ascend na Vercel

O projeto e um site estatico com `index.html`, `styles.css` e `script.js`.

## Opcao 1 - Pelo site da Vercel

1. Acesse https://vercel.com/new
2. Importe um repositorio GitHub com este projeto ou envie a pasta do projeto.
3. Framework Preset: `Other`.
4. Build Command: deixe vazio.
5. Output Directory: deixe vazio ou use `./`.
6. Clique em Deploy.

## Opcao 2 - Pela CLI

Instale Node.js com npm e rode dentro da pasta do projeto:

```bash
npx vercel
```

Para publicar em producao:

```bash
npx vercel --prod
```

## Contas demo

Jogador:

```text
pedro@ascend.app
ascend123
```

Master:

```text
master@ascend.app
master123
```

## Observacao importante

No MVP atual, os dados ficam no navegador via `localStorage`. Em producao, cada dispositivo tera seus proprios dados locais. Para contas reais sincronizadas entre usuarios, o proximo passo e adicionar backend, banco de dados e autenticação real.
