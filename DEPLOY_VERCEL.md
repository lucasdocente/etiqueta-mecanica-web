# Publicação na Vercel

## Opção 1 — pelo GitHub

1. Crie um repositório vazio no GitHub.
2. Envie todos os arquivos desta pasta para o repositório.
3. Entre em [vercel.com](https://vercel.com) com sua conta.
4. Selecione **Add New → Project**.
5. Importe o repositório criado.
6. Confira as configurações:
   - **Framework Preset:** Other
   - **Build Command:** deixe vazio
   - **Output Directory:** `dist`
7. Clique em **Deploy**.

Os próximos envios ao branch principal do GitHub serão publicados automaticamente.

## Opção 2 — pela Vercel CLI

Com Node.js instalado, abra o terminal nesta pasta e execute:

```bash
npx vercel
```

Para publicar como produção:

```bash
npx vercel --prod
```

## Dados e privacidade

O site não possui banco de dados. Informações de clientes e os cinco modelos ficam
no `localStorage` do navegador. Limpar os dados do site no navegador também apaga
os modelos salvos naquele dispositivo.
