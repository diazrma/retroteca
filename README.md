# 📼 Retroteca

O baú retrô do Brasil: um mural estilo Pinterest misturado com TV de tubo, que **se renova sozinho todo dia**.

- **Fita do dia**: cada dia, 9 categorias (Brasil Antigo, Carros, Games, Som, Tecnologia, Moda, Propaganda, Brinquedos, Cinema) sorteiam um tema, como Fusca, Orelhão, Augusto Malta, Master System ou Fitas VHS. As imagens vêm do **Openverse** e do **Wikimedia Commons**, com créditos e licença em cada uma. As buscas são em português, para trazer fotos brasileiras.
- **Títulos em português**: quando o título original está em outra língua, o site cria um título em português e mostra o original no detalhe.
- **Nota do curador-robô** em cada imagem, gerada a partir de frases retrô. Não usa API de IA nem tem custo.
- **Login com Google** para curtir ♥ e comentar 💬.
- **Mais curtidas**: ranking geral de todas as fitas.
- **⭐ Favoritos**: a pessoa salva imagens no seu baú pessoal (fica na conta Google, em qualquer aparelho).
- **🔎 Pesquisa**: busca livre (ex.: "fusca", "orelhão") no Openverse e no Wikimedia, com o mesmo mural, curtidas, comentários e favoritos.
- **📌 Murais**: a pessoa cria murais ("Garagem do vovô", "Anos 80 lá em casa"), salva imagens de qualquer fita ou busca, organiza arrastando e compartilha o link público (com preview no WhatsApp). A página "Murais" mostra também os murais da comunidade.
- **✋ Organizar fotos**: arraste as fotos do mural do dia para mudar a ordem (fica salva no aparelho).
- **✨ Descobridor de temas**: além dos 109 temas fixos, todo dia cada categoria explora um galho novo da árvore de categorias do Wikimedia Commons (milhares de galhos), então sempre há tema novo, sem IA paga.
- **🎵 Trilha sonora**: toca-fitas flutuante com a trilha do vídeo; começa no primeiro toque e pode ser pausada (a escolha fica lembrada).
- **🇧🇷 Só Brasil / 🌎 Mundo todo**: filtro que mostra só imagens brasileiras ou tudo; a escolha fica lembrada.
- **Zapear 📺**: modo TV de tubo com chiado entre os canais.
- **Compartilhar**: botão nativo do celular, WhatsApp, X, Facebook, Pinterest, Telegram e copiar link. Cada imagem tem página própria com preview.
- **Alertas no celular 🔔**: notificação push diária, só das categorias que a pessoa escolher (Android e iPhone, este com o site instalado na tela de início).
- **Arquivo**: toda fita antiga continua disponível (`/dia/AAAA-MM-DD`).

Nada de conteúdo fica salvo em banco: a fita é calculada a partir da data. O banco (Upstash Redis) guarda só curtidas, comentários e inscrições de notificação.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha o que tiver; sem Redis o site usa memória
npm run dev
```

Sem `AUTH_GOOGLE_ID` o botão de login não funciona, mas o resto do site roda normalmente.
Sem Redis, curtidas, comentários, favoritos, murais e inscrições ficam salvos em `.data/local-db.json` (só para testes locais).

**Testar notificações no celular:** o navegador só libera notificações em HTTPS (ou em `localhost`). No computador, teste em `http://localhost:3000/alertas`. No celular, use um túnel HTTPS temporário, por exemplo `ngrok http 3000`, e abra o link `https://…` que ele mostrar.

## Publicar na Vercel (passo a passo)

1. **Suba o projeto**: envie para um repositório no GitHub e importe em vercel.com/new, ou rode `vercel` nesta pasta.
2. **Banco**: no projeto na Vercel, vá em *Storage → Create → Upstash for Redis (plano grátis) → Connect*. As variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN` são criadas sozinhas.
3. **Login com Google**:
   - Em console.cloud.google.com, abra *APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web*.
   - Em *URIs de redirecionamento autorizados*, coloque `https://SEU-SITE.vercel.app/api/auth/callback/google`.
   - Na Vercel, crie `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` e `AUTH_SECRET` (gere com `npx auth secret`).
4. **Notificações**: copie `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` do seu `.env.local`, ou gere novas com `npx web-push generate-vapid-keys`.
5. **Cron**: crie `CRON_SECRET` com qualquer texto aleatório. O `vercel.json` já agenda o `/api/cron` todo dia às 10:00 UTC (7h em Brasília). Ele atualiza a página inicial e envia as notificações.
6. **URL**: crie `NEXT_PUBLIC_SITE_URL=https://SEU-SITE.vercel.app`.
7. **Openverse (recomendado)**: registre uma chave grátis (instruções no `.env.example`) e crie `OPENVERSE_CLIENT_ID` e `OPENVERSE_CLIENT_SECRET`. Sem ela, o limite de consultas é baixo e, em dias de muito acesso, as imagens vêm só do Wikimedia.
8. Faça um novo deploy (*Deployments → Redeploy*) para aplicar as variáveis.

## Vídeo de divulgação

O vídeo vertical (1080×1920, 31s, para Reels, TikTok, Shorts e Status) é gerado a partir do site de verdade:

```bash
npm run build && npm start              # em outro terminal
cd video && npm install
node render.mjs --site http://localhost:3000 --url seu-site.vercel.app
# → video/out/retroteca-promo.mp4
```

Ele precisa de Google Chrome, ffmpeg e Python 3 com numpy. A trilha é sintetizada pelo próprio script, então não há problema de direitos autorais. Para conferir só alguns quadros antes: `--preview 2,6,14,24,28`.

## Estrutura

| Pasta | O que tem |
| --- | --- |
| `lib/catalog.ts` | Categorias e temas (é aqui que você adiciona temas novos) |
| `lib/sources.ts` | Busca no Openverse e no Wikimedia e monta a fita do dia |
| `lib/caption.ts` | Notas do curador e títulos em português |
| `lib/store.ts` | Curtidas, comentários e inscrições de push (Redis ou memória) |
| `lib/push.ts` | Envio das notificações diárias |
| `app/` | Páginas e rotas de API |
| `components/` | Mural, modal da imagem, TV, compartilhar, alertas |
| `public/sw.js` | Service worker que recebe as notificações |
| `video/` | Gerador do vídeo de divulgação |
