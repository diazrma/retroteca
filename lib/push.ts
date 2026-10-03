import webpush from "web-push";
import { CATEGORY_BY_SLUG } from "./catalog";
import { themesFor } from "./sources";
import { allSubs, removeSub } from "./store";

const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const priv = process.env.VAPID_PRIVATE_KEY;

export const pushConfigured = Boolean(pub && priv);

/** Envia a notificação diária: cada pessoa recebe só as categorias que escolheu. */
export async function sendDaily(date: string) {
  if (!pub || !priv) return { sent: 0, failed: 0, skipped: "VAPID não configurado" };
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contato@retroteca.app", pub, priv);

  const themes = themesFor(date);
  const subs = await allSubs();
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (s) => {
      const mine = themes.filter((t) => s.cats.includes(t.cat.slug));
      if (!mine.length) return;
      const first = mine[0];
      const body = mine.map((t) => `${CATEGORY_BY_SLUG[t.cat.slug].emoji} ${t.theme.title}`).join(" · ");
      const payload = JSON.stringify({
        title: "📼 A fita de hoje chegou!",
        body,
        url: mine.length === 1 ? `/?cat=${first.cat.slug}` : "/",
        tag: "retroteca-" + date,
      });
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 60 * 60 * 12 });
        sent++;
      } catch (e: any) {
        failed++;
        if (e?.statusCode === 404 || e?.statusCode === 410) await removeSub(s.endpoint);
      }
    }),
  );
  return { sent, failed };
}
