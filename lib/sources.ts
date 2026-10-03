import { CATEGORIES, type Category, type Theme } from "./catalog";
import { captionFor, titleFor, uniqueTitles } from "./caption";
import { addDays, dayNumber, LAUNCH, rng, shuffle } from "./day";
import { firstSeen, markSeen, seenDays } from "./store";

export type Pin = {
  id: string;
  src: string;
  full: string;
  w?: number;
  h?: number;
  title: string;
  /** título original quando estava em outro idioma */
  original?: string;
  creator: string;
  license: string;
  licenseUrl?: string;
  source: string;
  provider: "Openverse" | "Wikimedia Commons";
  cat: string;
  theme: string;
  caption: string;
  /** imagem brasileira (para o filtro "Só Brasil") */
  br: boolean;
  /** de onde a imagem veio, quando não é a fita do dia (ex.: uma página de busca) */
  key?: string;
};

export type DayTheme = { cat: Category; theme: Theme; page: number };

export type Day = {
  date: string;
  themes: { cat: string; theme: string; intro: string; discovered?: string }[];
  pins: Pin[];
};

const UA = "Retroteca/1.0 (site de imagens retro; https://vercel.com)";
const DAY_SECONDS = 60 * 60 * 24;

/** Qual tema cada categoria exibe em um dia. */
export function themesFor(date: string): DayTheme[] {
  const dn = dayNumber(date);
  return CATEGORIES.map((cat, i) => {
    const n = cat.themes.length;
    const shifted = dn + i * 2;
    const cycle = Math.floor(shifted / n);
    const order = shuffle(cat.themes, rng(`${cat.slug}:${cycle}`));
    return { cat, theme: order[shifted % n], page: cycle };
  });
}

// ---- detecção de imagens brasileiras ----
const BR_TEXT =
  /brasil|brazil|brasileir|rio de janeiro|são paulo|sao paulo|minas gerais|belo horizonte|porto alegre|curitiba|salvador \(|recife|fortaleza|belém|manaus|niterói|petrópolis|campinas|florianópolis|goiânia|copacabana|ipanema|tectoy|pernambuco|ceará|paraná|bahia|santa catarina|rio grande do sul|espírito santo|maranhão|amazonas|arquivo nacional|correio da manhã|\(rj\)|\(sp\)|\(mg\)|- rj\b|- sp\b/i;
const PT_PT = /portugal|lisboa|coimbra|sintra|braga|madeira|açores|algarve|porto,? portugal/i;
const PT_WORDS = /[ãõç]|\b(de|do|da|dos|das|em|antigo|antiga|com)\b/i;

function isBrazil(text: string, t: DayTheme): boolean {
  if (t.theme.br) return true;
  if (PT_PT.test(text)) return false;
  if (BR_TEXT.test(text)) return true;
  // título/descrição em português (sem Portugal) vindo do Flickr/Commons: quase sempre Brasil
  return PT_WORDS.test(text) && /[ãõç]/i.test(text);
}

const clean = (s: string | undefined) =>
  (s ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

// Chave gratuita do Openverse (opcional): aumenta muito o limite de consultas.
// Registro: https://api.openverse.org/v1/#tag/auth/operation/register
let ovToken: { value: string; exp: number } | null = null;
async function openverseAuth(): Promise<Record<string, string>> {
  const id = process.env.OPENVERSE_CLIENT_ID;
  const secret = process.env.OPENVERSE_CLIENT_SECRET;
  if (!id || !secret) return {};
  if (!ovToken || ovToken.exp < Date.now()) {
    try {
      const r = await fetch("https://api.openverse.org/v1/auth_tokens/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
        cache: "no-store",
      });
      const d = await r.json();
      if (!d.access_token) return {};
      ovToken = { value: d.access_token, exp: Date.now() + (d.expires_in - 60) * 1000 };
    } catch {
      return {};
    }
  }
  return { Authorization: `Bearer ${ovToken.value}` };
}

async function getJson(url: string): Promise<any> {
  const extra = url.startsWith("https://api.openverse.org") ? await openverseAuth() : {};
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json", ...extra },
    next: { revalidate: DAY_SECONDS },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const data = await res.json();
  if (data?.error) throw new Error(`${data.error.code ?? "erro"} ${url.slice(0, 120)}`);
  return data;
}

const norm = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

async function fromOpenverse(t: DayTheme, n: number, strict = false): Promise<Pin[]> {
  const base = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(t.theme.q)}&page_size=${n}&mature=false`;
  // sem chave, o Openverse entrega até 240 resultados por busca; com chave, bem mais
  const maxPages = Math.floor((process.env.OPENVERSE_CLIENT_ID ? 2000 : 240) / n);
  const page = (t.page % maxPages) + 1;
  // temas com poucas fotos não têm páginas altas: volta para a primeira
  let data = await getJson(base + "&page=" + page).catch(() => null);
  if (!data?.results?.length && page > 1) data = await getJson(base + "&page=1");
  const words = norm(t.theme.q).split(" ").filter((w) => w.length > 2);
  // na busca livre, só fica o que tem a palavra no título ou nas tags (evita "Oenanthe fusca", um pássaro)
  const relevant = (r: any) => {
    const raw = [r.title, ...(r.tags ?? []).map((x: any) => x.name)].join(" ");
    if (BLOCK.test(raw)) return false;
    if (!strict) return true;
    const txt = norm(raw);
    return words.every((w) => txt.includes(w)) && !/\b(bird|insect|fly|flies|aves|inseto|spider|beetle larva|species|macro|orchid|flower|plant|fungus|flor|planta)\b/.test(txt);
  };
  return (data?.results ?? [])
    .filter((r: any) => r.url && r.thumbnail && relevant(r))
    .map(
      (r: any): Pin => ({
        id: "ov-" + r.id,
        src: r.thumbnail,
        full: r.url,
        w: r.width || undefined,
        h: r.height || undefined,
        ...titleFor(clean(r.title), "ov-" + r.id, t.theme.title),
        creator: clean(r.creator) || "Autor desconhecido",
        license: `CC ${String(r.license ?? "").toUpperCase()} ${r.license_version ?? ""}`.trim(),
        licenseUrl: r.license_url,
        source: r.foreign_landing_url || r.url,
        provider: "Openverse",
        cat: t.cat.slug,
        theme: t.theme.title,
        caption: captionFor("ov-" + r.id, t.theme.title),
        br: isBrazil([r.title, ...(r.tags ?? []).map((x: any) => x.name)].join(" "), t),
      }),
    );
}

// evita fotos de temas pesados que aparecem em acervos históricos
const AVOID = " -nude -naked -nudez -erotic -ditadura -acidente -funeral";
// filtro completo, aplicado depois sobre título, descrição e categorias
const BLOCK =
  /(nude|nudity|naked|nua|nu|nudez|topless|erotic|erótic|sexy|lingerie|ditadura|manifesta|protesto|acidente|censura|comício|prisão|guerra|cadáver|enterro|funeral|morto|morte)/i;
const BIO_RE = /(bird|birds|aves?|pássaro|insect|inseto|species|espécie|oenanthe|ophrys|orchid|orquídea|fungus|fungo)/i;

const WM = "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&uselang=pt&iiextmetadatalanguage=pt";
const WM_INFO = "&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=640";

async function fromWikimedia(t: DayTheme, n: number, query = t.theme.wq, forceBr = false, noBio = false): Promise<Pin[]> {
  const base =
    WM +
    `&generator=search&gsrsearch=${encodeURIComponent("filetype:bitmap " + query + AVOID)}` +
    `&gsrnamespace=6&gsrlimit=${n}` +
    WM_INFO;
  // cada vez que o tema volta, pega a próxima página; se acabar, recomeça num ponto diferente
  const offset = Math.min(t.page * n, 9900);
  let data = await getJson(base + "&gsroffset=" + offset);
  if (!data.query?.pages && offset > 0) data = await getJson(base + "&gsroffset=" + (t.page % 10) * n);
  return mapWikimedia(data, t, forceBr, noBio);
}

function mapWikimedia(data: any, t: DayTheme, forceBr: boolean, noBio: boolean): Pin[] {
  const pages = Object.values<any>(data.query?.pages ?? {}).filter((p) => {
    const m = p.imageinfo?.[0]?.extmetadata ?? {};
    const txt = [p.title, clean(m.ImageDescription?.value), clean(m.Categories?.value), clean(m.ObjectName?.value)].join(" ");
    return !BLOCK.test(txt) && !(noBio && BIO_RE.test(txt));
  });
  const label = forceBr && !t.theme.slug.startsWith("auto:") ? `${t.cat.name.split(" & ")[0]} do Brasil` : t.theme.title;
  return pages
    .filter((p) => p.imageinfo?.[0]?.thumburl)
    .map((p): Pin => {
      const info = p.imageinfo[0];
      const meta = info.extmetadata ?? {};
      const id = "wm-" + p.pageid;
      return {
        id,
        src: info.thumburl,
        full: info.responsiveUrls?.["2"] ?? info.thumburl,
        w: info.thumbwidth,
        h: info.thumbheight,
        ...titleFor(
          [clean(meta.ImageDescription?.value), clean(meta.ObjectName?.value)].find((x) => x && x.length < 110) ||
            String(p.title).replace(/^File:/, "").replace(/\.[a-z]+$/i, "").replace(/[_]/g, " "),
          id,
          label,
        ),
        creator: clean(meta.Artist?.value) || "Autor desconhecido",
        license: clean(meta.LicenseShortName?.value) || "Ver fonte",
        licenseUrl: meta.LicenseUrl?.value,
        source: info.descriptionurl,
        provider: "Wikimedia Commons",
        cat: t.cat.slug,
        theme: label,
        caption: captionFor(id, label),
        br:
          forceBr ||
          isBrazil(
            [p.title, clean(meta.ImageDescription?.value), clean(meta.Categories?.value), clean(meta.ObjectName?.value)].join(" "),
            t,
          ),
      };
    });
}

// ---- descobridor de temas: passeia pela árvore de categorias do Wikimedia ----

const SKIP_CAT = /(placeholder|pronunciation|conference|assembly|congress|festival|diy|merged|copy|screenshots?|manuals?|patents?|templates?|stubs?|cafés|restaurants|shops? interior|in art|damaged|people|portraits|by person|maps|logos|videos|audio|drawings|diagrams|icons|svg|quality images|uploaded|deletion|unidentified|nude|nudity|erotic|war|military|nazi|weapons?|funeral|cemeter|accidents)/i;

const DICT: [RegExp, string][] = [
  [/\bPhotographs by\b/gi, "Fotos de"],
  [/\bin the (anos \d+)/gi, "nos $1"],
  [/\bfrom the (anos \d+)/gi, "dos $1"],
  [/\bin Brazil\b/gi, "no Brasil"],
  [/\bin Japan\b/gi, "no Japão"],
  [/\bin Germany\b/gi, "na Alemanha"],
  [/\bin France\b/gi, "na França"],
  [/\bin Italy\b/gi, "na Itália"],
  [/\bin the United States\b/gi, "nos Estados Unidos"],
  [/\bin the United Kingdom\b/gi, "no Reino Unido"],
  [/\bin Portugal\b/gi, "em Portugal"],
  [/\bautomobiles\b/gi, "automóveis"],
  [/\bcars\b/gi, "carros"],
  [/\bfashion\b/gi, "moda"],
  [/\bclothing\b/gi, "roupas"],
  [/\bdresses\b/gi, "vestidos"],
  [/\bhair\b/gi, "cabelo"],
  [/\bfemale headgear\b/gi, "chapéus femininos"],
  [/\bmale headgear\b/gi, "chapéus masculinos"],
  [/\bheadgear\b/gi, "chapéus"],
  [/\bhats\b/gi, "chapéus"],
  [/\btypewriters\b/gi, "máquinas de escrever"],
  [/\btelephones\b/gi, "telefones"],
  [/\btelevision sets\b/gi, "televisores"],
  [/\bradio receivers\b/gi, "rádios"],
  [/\bcalculators\b/gi, "calculadoras"],
  [/\bhome computers\b/gi, "computadores pessoais"],
  [/\bcomputers\b/gi, "computadores"],
  [/\barcade games\b/gi, "jogos de fliperama"],
  [/\bhandheld game consoles\b/gi, "videogames portáteis"],
  [/\bgramophone records\b/gi, "discos de vinil"],
  [/\brecords\b/gi, "discos"],
  [/\bjukeboxes\b/gi, "jukeboxes"],
  [/\btoys\b/gi, "brinquedos"],
  [/\bdolls\b/gi, "bonecas"],
  [/\bboard games\b/gi, "jogos de tabuleiro"],
  [/\bfilm posters\b/gi, "cartazes de filmes"],
  [/\bposters\b/gi, "cartazes"],
  [/\badvertisements\b/gi, "anúncios"],
  [/\bneon signs\b/gi, "letreiros neon"],
  [/\benamel signs\b/gi, "placas esmaltadas"],
  [/\bsigns\b/gi, "placas"],
  [/\bpackaging\b/gi, "embalagens"],
  [/\banimation\b/gi, "animação"],
  [/\bcinemas\b/gi, "cinemas"],
  [/\btrams\b/gi, "bondes"],
  [/\bby brand\b/gi, "por marca"],
  [/\bby country\b/gi, "por país"],
  [/\bby color\b/gi, "por cor"],
  [/\bby city\b/gi, "por cidade"],
  [/\bby decade\b/gi, "por década"],
  [/\bmusic\b/gi, "música"],
  [/\bwith\b/gi, "com"],
  [/\bat\b/gi, "no"],
  [/\bof\b/gi, "de"],
  [/\band\b/gi, "e"],
];
// palavras em português aceitas no meio do título (o resto, se for minúsculo, é inglês)
const PT_OK = new Set(
  "de do da dos das no na nos nas em com e por a o os as anos marca país cor cidade década música discos vinil automóveis carros moda roupas vestidos cabelo chapéus femininos masculinos máquinas escrever telefones televisores rádios calculadoras computadores pessoais jogos fliperama videogames portáteis jukeboxes brinquedos bonecas tabuleiro cartazes filmes anúncios letreiros neon placas esmaltadas embalagens animação cinemas bondes fotos".split(" "),
);
const EN_FIRST = /^(country|film|clothing|people|women|men|female|male|old|vintage|black|white|red|blue|green|names|music|records|signs|photographs|images|pictures|interior|exterior|views?|details?)$/i;
function isPortuguese(t: string): boolean {
  const words = t.split(/\s+/);
  if (EN_FIRST.test(words[0])) return false;
  return words.slice(1).every((w) => /^[\d.,'’-]+$/.test(w) || /^[A-ZÀ-Ý0-9]/.test(w) || PT_OK.has(w.toLowerCase()));
}

/** Nome de categoria → título em português; se sobrar inglês, usa um nome genérico em português. */
function ptCategory(name: string, cat: Category): string {
  let t = name
    .replace(/^Category:/, "")
    .replace(/\b(19|20)(\d)0s\b/g, (_, c, d) => (c === "19" ? `anos ${d}0` : `anos 20${d}0`));
  for (const [re, pt] of DICT) t = t.replace(re, pt);
  t = t.replace(/\s+/g, " ").trim();
  if (!isPortuguese(t) || t.length > 48) return `Achado do arquivo de ${cat.name.split(" & ")[0]}`;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

async function subcats(cat: string): Promise<{ title: string; files: number; subcats: number }[]> {
  const url =
    WM +
    `&generator=categorymembers&gcmtitle=${encodeURIComponent(cat)}&gcmtype=subcat&gcmlimit=200&prop=categoryinfo`;
  const data = await getJson(url);
  return Object.values<any>(data.query?.pages ?? {})
    .filter((p) => !SKIP_CAT.test(p.title))
    .map((p) => ({ title: p.title, files: p.categoryinfo?.files ?? 0, subcats: p.categoryinfo?.subcats ?? 0 }));
}

/** Escolhe, de forma determinística para o dia, um galho com fotos suficientes. */
async function discover(cat: Category, date: string): Promise<{ title: string; category: string } | null> {
  if (!cat.roots.length) return null;
  const r = rng(`descobre:${cat.slug}:${date}`);
  let current = "Category:" + cat.roots[Math.floor(r() * cat.roots.length)];
  let best: string | null = null;
  for (let depth = 0; depth < 3; depth++) {
    const subs = await subcats(current).catch(() => []);
    const good = subs.filter((s) => s.files >= 8 || s.subcats > 0);
    if (!good.length) break;
    const next = good[Math.floor(r() * good.length)];
    current = next.title;
    if (next.files >= 8) {
      best = current;
      // às vezes para aqui, às vezes desce mais um nível: assim a variedade é enorme
      if (depth >= 1 && r() < 0.5) break;
    }
  }
  return best ? { title: ptCategory(best, cat), category: best } : null;
}

async function fromDiscovery(cat: Category, date: string, n: number): Promise<{ theme: string | null; pins: Pin[] }> {
  const found = await discover(cat, date);
  if (!found) return { theme: null, pins: [] };
  const t: DayTheme = {
    cat,
    theme: { slug: "auto:" + found.category, title: found.title, q: "", wq: "", intro: "" },
    page: 0,
  };
  const url =
    WM +
    `&generator=categorymembers&gcmtitle=${encodeURIComponent(found.category)}&gcmtype=file&gcmlimit=${n}` +
    `&gcmsort=timestamp&gcmdir=desc` +
    WM_INFO;
  const data = await getJson(url);
  const br = cat.slug === "brasil" || /brasil|brazil|rio de janeiro|são paulo/i.test(found.category);
  return { theme: found.title, pins: mapWikimedia(data, t, br, true) };
}

async function settle(p: Promise<Pin[]>): Promise<Pin[]> {
  try {
    return await p;
  } catch (e) {
    console.warn("[retroteca] fonte falhou:", (e as Error).message);
    return [];
  }
}

/** Busca as imagens de um tema. `shift` > 0 pega páginas seguintes (para repor imagens repetidas). */
async function collect(t: DayTheme, date: string, shift: number, discovered: Record<string, string>): Promise<Pin[]> {
  const tt = shift ? { ...t, page: t.page + shift } : t;
  const [a, b, c, d] = await Promise.all([
    settle(fromOpenverse(tt, 9)),
    settle(fromWikimedia(tt, 6)),
    // fotos extras só do Brasil para o filtro "Só Brasil"
    // a busca extra do Brasil anda um passo por dia
    t.cat.bq ? settle(fromWikimedia({ ...t, page: dayNumber(date) - dayNumber(LAUNCH) + shift * 1000 }, 5, t.cat.bq, true)) : Promise.resolve([]),
    // tema descoberto automaticamente (só na primeira busca)
    shift ? Promise.resolve({ theme: null, pins: [] as Pin[] }) : fromDiscovery(t.cat, date, 6).catch(() => ({ theme: null, pins: [] as Pin[] })),
  ]);
  if (d.theme && d.pins.length >= 3) discovered[t.cat.slug] = d.theme;
  return [...a, ...b, ...c, ...(d.pins.length >= 3 ? d.pins : [])];
}

const MIN_PER_CAT = 8;
const building = new Map<string, Promise<Day>>();

/** Monta a fita completa de um dia (todas as categorias, imagens misturadas), sem repetir imagens de dias anteriores. */
export async function getDay(date: string): Promise<Day> {
  // os dias anteriores precisam estar registrados antes, em ordem, para o resultado ser sempre o mesmo
  if (date > LAUNCH) {
    const done = await seenDays().catch(() => null);
    if (done) {
      for (let d = LAUNCH; d < date; d = addDays(d, 1)) if (!done.has(d)) await getDay(d);
    }
  }
  let p = building.get(date);
  if (!p) {
    p = buildDay(date).finally(() => building.delete(date));
    building.set(date, p);
  }
  return p;
}

async function buildDay(date: string): Promise<Day> {
  const themes = themesFor(date);
  const discovered: Record<string, string> = {};
  let perCat: Pin[][] = [];
  // poucas chamadas por vez para não estourar o limite das APIs gratuitas
  for (let i = 0; i < themes.length; i += 3) {
    perCat.push(...(await Promise.all(themes.slice(i, i + 3).map((t) => collect(t, date, 0, discovered)))));
  }

  // tira o que já saiu numa fita anterior; se um tema ficar magro, busca as páginas seguintes
  const old = async (pins: Pin[]) => {
    const seen = await firstSeen(pins.flatMap((p) => [p.id, p.src])).catch(() => ({}) as Record<string, string>);
    return (p: Pin) => (seen[p.id] ?? date) < date || (seen[p.src] ?? date) < date;
  };
  let isOld = await old(perCat.flat());
  perCat = perCat.map((l) => l.filter((p) => !isOld(p)));
  for (let shift = 1; shift <= 2; shift++) {
    const thin = themes.map((t, i) => (perCat[i].length < MIN_PER_CAT ? i : -1)).filter((i) => i >= 0);
    if (!thin.length) break;
    const extra = await Promise.all(thin.map((i) => collect(themes[i], date, shift, discovered)));
    isOld = await old(extra.flat());
    thin.forEach((i, j) => perCat[i].push(...extra[j].filter((p) => !isOld(p))));
  }

  // mistura estilo mural: intercala categorias e embaralha levemente
  const seen = new Set<string>();
  const r = rng("mix:" + date);
  const lists = perCat.map((l) => shuffle(l, r));
  const pins: Pin[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) {
    for (const l of shuffle(lists, r)) {
      const p = l[i];
      if (p && !seen.has(p.id) && !seen.has(p.src)) {
        seen.add(p.id);
        seen.add(p.src);
        pins.push(p);
      }
    }
  }

  const final = uniqueTitles(pins);
  await markSeen(date, final.flatMap((p) => [p.id, p.src])).catch((e) => console.warn("[retroteca] não deu para registrar a fita:", (e as Error).message));

  return {
    date,
    themes: themes.filter((t) => pins.some((p) => p.cat === t.cat.slug)).map((t) => ({
      cat: t.cat.slug,
      theme: t.theme.title,
      intro: t.theme.intro,
      discovered: discovered[t.cat.slug],
    })),
    pins: final,
  };
}

// ---- pesquisa ----

export const SEARCH_PREFIX = "q-";

export function cleanQuery(q: string | null | undefined): string {
  return (q ?? "").replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

/** Busca livre no Openverse e no Wikimedia (resultado em cache por 1 dia). */
export const SEARCH_PAGE = "~";

/** Chave de uma página de busca: "q-fusca" ou "q-fusca~2". */
export function searchKey(q: string, page = 1) {
  return SEARCH_PREFIX + encodeURIComponent(q.toLowerCase()) + (page > 1 ? SEARCH_PAGE + page : "");
}

export async function searchPins(raw: string, page = 1): Promise<Pin[]> {
  const q = cleanQuery(raw);
  if (q.length < 2) return [];
  page = Math.min(Math.max(1, Math.floor(page) || 1), 10);
  const t: DayTheme = {
    cat: { slug: "busca", name: "Busca", emoji: "🔎", color: "#ffd23f", themes: [], roots: [] },
    theme: { slug: "busca", title: q.charAt(0).toUpperCase() + q.slice(1), q, wq: q, intro: "" },
    page: page - 1,
  };
  const [a, b, c] = await Promise.all([
    settle(fromOpenverse(t, 30, true)),
    settle(fromWikimedia(t, 12, q, false, true)),
    settle(fromWikimedia(t, 8, q + " Brasil", false, true)),
  ]);
  const seen = new Set<string>();
  const out: Pin[] = [];
  const lists = [a, b, c];
  for (let i = 0; lists.some((l) => i < l.length); i++) {
    for (const l of lists) {
      const p = l[i];
      if (p && !seen.has(p.id)) {
        seen.add(p.id);
        out.push(p);
      }
    }
  }
  const key = searchKey(q, page);
  return uniqueTitles(out).map((p) => ({ ...p, key }));
}

/** Acha uma imagem pela "chave": uma data (AAAA-MM-DD) ou uma busca (q-termo). */
export async function findPin(key: string, id: string): Promise<Pin | null> {
  let pins: Pin[];
  if (key.startsWith(SEARCH_PREFIX)) {
    const [q, pg] = key.slice(SEARCH_PREFIX.length).split(SEARCH_PAGE);
    pins = await searchPins(decodeURIComponent(q), Number(pg) || 1);
  } else {
    pins = (await getDay(key)).pins;
  }
  return pins.find((p) => p.id === id) ?? null;
}
