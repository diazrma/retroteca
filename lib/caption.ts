// Notas do "curador": geradas a partir de frases retrô, sorteadas de forma
// determinística pelo id da imagem (a mesma imagem sempre ganha a mesma nota).
import { pick, rng } from "./day";

const OPENERS = [
  "Que coisa mais supimpa!",
  "Isso aqui é um broto de imagem.",
  "Rebobina, que vale ver de novo.",
  "Cheirinho de fita VHS no ar.",
  "Daquelas que a vó guardava na gaveta.",
  "Bacana pra chuchu!",
  "Achado de feira de antiguidades.",
  "Coisa fina, de primeira linha.",
  "Parece capa de LP, né não?",
  "Tirado direto do álbum de família.",
  "Isso é mais raro que ficha de fliperama perdida.",
  "Pura nostalgia em alta definição (ou quase).",
  "Sintonizei no canal certo.",
  "Esse aqui merecia um pôster no quarto.",
];

const MIDDLES = [
  "Repara nos detalhes: isso é {tema} raiz.",
  "Hoje o assunto é {tema}, e essa peça diz tudo.",
  "Quem viveu a época de {tema} sabe como era.",
  "Um clássico absoluto de {tema}.",
  "Se {tema} tivesse museu, essa estaria na entrada.",
  "Para quem curte {tema}, isso é ouro.",
];

const CLOSERS = [
  "Nota do curador: 10 de 10.",
  "Curte aí antes que a fita enrosque.",
  "Manda pra aquele amigo saudosista.",
  "Ninguém fazia igual.",
  "Hoje em dia não se fabrica mais assim.",
  "Coloca na moldura e pendura na sala.",
  "Coisa de cinema.",
  "Deixa um comentário com a sua lembrança!",
  "Joinha de quem viveu, joinha de quem queria ter vivido.",
];

export function captionFor(id: string, theme: string): string {
  const r = rng("cap:" + id);
  const tema = theme;
  const mid = pick(MIDDLES, r).replace("{tema}", tema);
  return `${pick(OPENERS, r)} ${mid} ${pick(CLOSERS, r)}`;
}

const DAY_OPENERS = [
  "Aperta o PLAY:",
  "Plim-plim! Chegou a fita de hoje.",
  "Sintonize, ajuste a antena e aproveite.",
  "Direto do baú, fresquinho como pão de padaria:",
  "Hoje a máquina do tempo parou aqui:",
];

export function dayNote(date: string): string {
  return pick(DAY_OPENERS, rng("day:" + date));
}

// ---- títulos sempre em português ----

const EN = /\b(the|of|and|with|in|on|at|from|for|my|old|vintage|antique|classic|machine|car|cars|record|player|tape|toy|toys|camera|phone|sign|poster|cover|game|games|beetle|bus|theater|theatre|street|view|front|side|black|white|red|blue|green|yellow|is|this|at|by|new|day|night|museum|collection|show)\b/i;
const PT = /[ãõçáéíóúâêôà]|\b(de|do|da|dos|das|em|no|na|nos|nas|com|para|antigo|antiga|antigos|antigas|rua|praça|avenida|vista|e)\b/i;

const PT_TITLES = [
  "achado do baú",
  "relíquia de coleção",
  "clássico absoluto",
  "direto da garagem",
  "lembrança de infância",
  "peça rara",
  "tesouro escondido",
  "foto de época",
  "saudade em forma de foto",
  "joia retrô",
  "cena de outros tempos",
  "do álbum da família",
  "coisa de colecionador",
  "memória afetiva",
  "puro suco de nostalgia",
  "dos bons tempos",
  "de cair o queixo",
  "achado de antiquário",
  "pérola esquecida",
  "viagem no tempo",
];

/** Mantém títulos em português; troca os estrangeiros por um título em português. */
export function titleFor(raw: string, id: string, theme: string): { title: string; original?: string } {
  const cleaned = raw.replace(/\s*\(\d{6,}\)\s*$/, "").replace(/\s+-\s*\d+$/, "").trim();
  // títulos bilíngues: "Câmera antiga / Old Camera"
  const parts = cleaned.split(/\s+\/\s+|\s+\|\s+/);
  const pt = parts.find((x) => PT.test(x) && !(EN.test(x) && !/[ãõçáéíóúâêôà]/i.test(x)));
  if (pt && !/[\u3040-\u9fff]/.test(pt)) return { title: pt.length > 90 ? pt.slice(0, 87) + "…" : pt };
  const label = PT_TITLES[hashId(id) % PT_TITLES.length];
  return { title: `${theme}: ${label}`, original: cleaned || undefined };
}

function hashId(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Evita títulos gerados repetidos na mesma tela, trocando para outra expressão. */
export function uniqueTitles<T extends { id: string; title: string; original?: string; theme: string }>(pins: T[]): T[] {
  const used = new Set<string>();
  return pins.map((p) => {
    if (!used.has(p.title)) {
      used.add(p.title);
      return p;
    }
    if (p.title.startsWith(p.theme + ": ")) {
      const start = hashId(p.id);
      for (let k = 1; k < PT_TITLES.length; k++) {
        const t = `${p.theme}: ${PT_TITLES[(start + k) % PT_TITLES.length]}`;
        if (!used.has(t)) {
          used.add(t);
          return { ...p, title: t };
        }
      }
    }
    return p;
  });
}
