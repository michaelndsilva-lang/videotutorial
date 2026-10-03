// Verificação determinística da resposta do agente ANTES de ir pro lead.
//
// Instrução no prompt não basta: já vimos (conversas reais da Mariza,
// 02/10/2026) o modelo chamar "sexta, 02/10" de "amanhã" quando sexta era
// hoje, e marcar reunião "sexta às 10h" às 19h36 da própria sexta — mesmo com
// a tabela de datas pronta no system prompt. Também vimos ele inventar preços
// de produtos e margens de revenda ("The Boss 100 ml R$ 67, revende por
// R$ 115 a R$ 120") que não existem em lugar nenhum do prompt. Este módulo
// detecta esses erros no texto gerado para que gerarRespostaAgente refaça a
// resposta (ou, em último caso, corte a frase problemática).

export type ContextoTempo = {
  // Data de hoje em Brasília, "YYYY-MM-DD".
  hojeISO: string;
  // Hora/minuto atuais em Brasília.
  hora: number;
  minuto: number;
};

export type ProblemaResposta = {
  tipo: "data" | "valor";
  descricao: string;
};

const MESES: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  "março": 3,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

// Índice = getUTCDay() (0 = domingo).
const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const DIA_SEMANA_REGEX = /\b(domingo|segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado)\b/gi;

const DIA_MS = 86_400_000;

function normalizarDiaSemana(s: string): string {
  const t = s.toLowerCase();
  if (t.startsWith("ter")) return "terça";
  if (t.startsWith("s") && t !== "sexta" && t !== "segunda") return "sábado";
  return t;
}

function formatarData(d: Date): string {
  const dia = String(d.getUTCDate()).padStart(2, "0");
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${DIAS_SEMANA[d.getUTCDay()]}, ${dia}/${mes}/${d.getUTCFullYear()}`;
}

type DataMencionada = { data: Date; inicio: number; fim: number };

// Encontra datas explícitas no texto: "02 de outubro", "2 de outubro de
// 2026", "02/10", "02/10/2026". Ano omitido = ano corrente, a não ser que
// isso jogue a data mais de 60 dias pro passado (ex.: em dezembro falando de
// "05 de janeiro") — aí é o ano seguinte.
function encontrarDatas(texto: string, hoje: Date): DataMencionada[] {
  const datas: DataMencionada[] = [];
  const anoAtual = hoje.getUTCFullYear();

  function montar(dia: number, mes: number, ano: number | null): Date | null {
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
    let d = new Date(Date.UTC(ano ?? anoAtual, mes - 1, dia));
    if (d.getUTCDate() !== dia) return null;
    if (ano === null && hoje.getTime() - d.getTime() > 60 * DIA_MS) {
      d = new Date(Date.UTC(anoAtual + 1, mes - 1, dia));
    }
    return d;
  }

  const porExtenso =
    /\b(\d{1,2})\s+de\s+(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+(\d{4}))?/gi;
  for (const m of texto.matchAll(porExtenso)) {
    const d = montar(Number(m[1]), MESES[m[2].toLowerCase()], m[3] ? Number(m[3]) : null);
    if (d) datas.push({ data: d, inicio: m.index!, fim: m.index! + m[0].length });
  }

  // Exige que não seja parte de algo maior tipo "24/7" de horário ou um
  // número de telefone/URL — dia e mês com 1–2 dígitos e fronteira dos dois
  // lados.
  const numerica = /(?<![\d/])(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?(?![\d/])/g;
  for (const m of texto.matchAll(numerica)) {
    const ano = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : null;
    const d = montar(Number(m[1]), Number(m[2]), ano);
    if (d) datas.push({ data: d, inicio: m.index!, fim: m.index! + m[0].length });
  }

  return datas;
}

// Trecho da mesma frase imediatamente antes da data (ex.: "amanhã, sábado, ").
function trechoAntes(texto: string, inicio: number): string {
  const antes = texto.slice(Math.max(0, inicio - 45), inicio);
  const corte = Math.max(antes.lastIndexOf("."), antes.lastIndexOf("!"), antes.lastIndexOf("?"), antes.lastIndexOf("\n"));
  return antes.slice(corte + 1);
}

// Primeiro horário logo depois da data, na mesma frase ("às 10h", "10:30",
// "às 8 horas"). Retorna minutos desde 00:00.
function horarioDepois(texto: string, fim: number): number | null {
  const depois = texto.slice(fim, fim + 30).split(/[.!?\n]/)[0];
  const m = depois.match(/\b(\d{1,2})\s*(?:h|:|horas?\b)\s*(\d{2})?/i);
  if (!m) return null;
  const h = Number(m[1]);
  if (h > 23) return null;
  return h * 60 + (m[2] ? Number(m[2]) : 0);
}

export function validarDatas(texto: string, tempo: ContextoTempo): ProblemaResposta[] {
  const problemas: ProblemaResposta[] = [];
  const hoje = new Date(`${tempo.hojeISO}T00:00:00Z`);
  const agoraMin = tempo.hora * 60 + tempo.minuto;

  for (const { data, inicio, fim } of encontrarDatas(texto, hoje)) {
    const diff = Math.round((data.getTime() - hoje.getTime()) / DIA_MS);
    const citado = texto.slice(inicio, fim);
    const real = formatarData(data);

    if (diff < 0) {
      problemas.push({
        tipo: "data",
        descricao: `Você citou "${citado}" (${real}), que já PASSOU — hoje é ${formatarData(hoje)}. Nunca sugira, marque ou confirme reunião numa data passada.`,
      });
      continue;
    }

    const antes = trechoAntes(texto, inicio).toLowerCase();
    const diasNoTrecho = [...antes.matchAll(DIA_SEMANA_REGEX)];
    const diaCitado = diasNoTrecho.length ? normalizarDiaSemana(diasNoTrecho[diasNoTrecho.length - 1][1]) : null;
    if (diaCitado && diaCitado !== DIAS_SEMANA[data.getUTCDay()]) {
      problemas.push({
        tipo: "data",
        descricao: `Você escreveu "${diaCitado}" junto com "${citado}", mas ${citado} é ${real}. O dia da semana não bate com a data.`,
      });
    }

    const rotulo = /depois de amanh[ãa]/.test(antes)
      ? 2
      : /amanh[ãa]/.test(antes)
        ? 1
        : /\bhoje\b/.test(antes)
          ? 0
          : null;
    // "amanhã ou segunda, 05/10": o rótulo se refere a outra opção, não a
    // esta data.
    const depoisDoRotulo = antes.split(/amanh[ãa]|\bhoje\b/).pop() ?? "";
    if (rotulo !== null && rotulo !== diff && !/\bou\b/.test(depoisDoRotulo)) {
      const nomes = ["hoje", "amanhã", "depois de amanhã"];
      const correta = formatarData(new Date(hoje.getTime() + rotulo * DIA_MS));
      problemas.push({
        tipo: "data",
        descricao: `Você chamou "${citado}" (${real}) de "${nomes[rotulo]}", mas ${nomes[rotulo]} é ${correta}.`,
      });
    }

    if (diff === 0) {
      const horario = horarioDepois(texto, fim);
      if (horario !== null && horario <= agoraMin) {
        problemas.push({
          tipo: "data",
          descricao: `Você sugeriu/confirmou um horário HOJE (${citado}) que já passou — agora são ${String(tempo.hora).padStart(2, "0")}:${String(tempo.minuto).padStart(2, "0")}. Escolha um horário futuro (hoje mais tarde, se fizer sentido, ou outro dia).`,
        });
      }
    }
  }

  // "Amanhã podemos agendar. ... sexta-feira, 02 de outubro" com 02/10 sendo
  // hoje: o "amanhã" está em outra frase, então a checagem por trecho acima
  // não pega. Se a mensagem fala em amanhã, cita a data de hoje sem chamá-la
  // de "hoje" e não cita a data real de amanhã, o modelo confundiu os dois.
  const datas = encontrarDatas(texto, hoje);
  const diffs = datas.map(({ data }) => Math.round((data.getTime() - hoje.getTime()) / DIA_MS));
  if (/(?<!depois de )amanh[ãa]/i.test(texto) && !diffs.includes(1)) {
    const hojeSemRotulo = datas.find(
      ({ inicio }, i) => diffs[i] === 0 && !/\bhoje\b/i.test(trechoAntes(texto, inicio))
    );
    if (hojeSemRotulo) {
      problemas.push({
        tipo: "data",
        descricao: `Você falou em "amanhã" mas citou "${texto.slice(hojeSemRotulo.inicio, hojeSemRotulo.fim)}", que é HOJE (${formatarData(hoje)}). Amanhã é ${formatarData(new Date(hoje.getTime() + DIA_MS))}.`,
      });
    }
  }

  // "hoje às 10h" sem data explícita.
  for (const m of texto.matchAll(/\bhoje\b[^.!?\n]{0,25}?\b(\d{1,2})\s*(?:h|:|horas?\b)\s*(\d{2})?/gi)) {
    const h = Number(m[1]);
    if (h > 23) continue;
    if (h * 60 + (m[2] ? Number(m[2]) : 0) <= agoraMin) {
      problemas.push({
        tipo: "data",
        descricao: `Você sugeriu "${m[0]}", mas esse horário de hoje já passou — agora são ${String(tempo.hora).padStart(2, "0")}:${String(tempo.minuto).padStart(2, "0")}.`,
      });
    }
  }

  return problemas;
}

// "79,90" → 7990; "1.000" → 100000; "600" → 60000; "19,9" → 1990.
function paraCentavos(num: string): number {
  const limpo = num.replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  return Math.round(Number.parseFloat(limpo) * 100);
}

const NUM = String.raw`\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?`;

// Todo número que aparece nas fontes autorizadas (prompt do admin + contexto
// injetado pelo código), em centavos. Lista larga de propósito: se o número
// está no prompt, o agente pode falar dele.
// Percentuais à parte: o "30" de "30 no mês" não autoriza "30% de lucro".
export type NumerosAutorizados = { valores: Set<number>; percentuais: Set<number> };

export function numerosAutorizados(...fontes: (string | null | undefined)[]): NumerosAutorizados {
  const valores = new Set<number>([0]);
  // "100% online", "100% natural" não é número de ganho.
  const percentuais = new Set<number>([10000]);
  for (const fonte of fontes) {
    if (!fonte) continue;
    for (const m of fonte.matchAll(new RegExp(NUM, "g"))) valores.add(paraCentavos(m[0]));
    for (const m of fonte.matchAll(new RegExp(String.raw`(${NUM})\s*%`, "g"))) percentuais.add(paraCentavos(m[1]));
  }
  return { valores, percentuais };
}

// Valores em dinheiro ("R$ 67,00", "R$ 110 a R$ 120", "R$ 115 a 120",
// "50 reais") e percentuais ("30% de lucro") que não estão no prompt.
export function validarValores(texto: string, autorizados: NumerosAutorizados): ProblemaResposta[] {
  const encontrados: string[] = [];
  const percentuaisInvalidos: string[] = [];

  const dinheiro = new RegExp(String.raw`R\$\s*(${NUM})(?:\s*(?:a|até|-|–)\s*(?:R\$\s*)?(${NUM})(?!\s*(?:%|ml)))?`, "gi");
  for (const m of texto.matchAll(dinheiro)) {
    encontrados.push(m[1]);
    if (m[2]) encontrados.push(m[2]);
  }
  for (const m of texto.matchAll(new RegExp(String.raw`(?<!R\$\s*)\b(${NUM})\s*(?:reais|conto)\b`, "gi"))) {
    encontrados.push(m[1]);
  }
  for (const m of texto.matchAll(new RegExp(String.raw`\b(${NUM})\s*%`, "g"))) {
    if (!autorizados.percentuais.has(paraCentavos(m[1]))) percentuaisInvalidos.push(`${m[1]}%`);
  }

  const invalidos = [
    ...[...new Set(encontrados)].filter((n) => !autorizados.valores.has(paraCentavos(n))).map((n) => `R$ ${n}`),
    ...new Set(percentuaisInvalidos),
  ];
  if (!invalidos.length) return [];
  return [
    {
      tipo: "valor",
      descricao: `Você citou valores que NÃO estão nas suas instruções: ${invalidos.join(", ")}. Isso é informação inventada. Você só pode citar números (preços, lucros, ganhos, margens, percentuais, faturamento) que aparecem literalmente nas suas instruções. Se o lead perguntar o preço/ganho de um produto específico que não está nas instruções, NÃO estime nem dê faixa ("em torno de", "cerca de") — diga que os preços de cada produto estão no catálogo e que você confirma o valor exato.`,
    },
  ];
}

export function validarResposta(
  texto: string,
  tempo: ContextoTempo,
  autorizados: NumerosAutorizados | null
): ProblemaResposta[] {
  return [...validarDatas(texto, tempo), ...(autorizados ? validarValores(texto, autorizados) : [])];
}

// Último recurso, quando nem a regeneração corrigiu: remove só as frases com
// problema, mantendo o resto da resposta. Se não sobrar nada aproveitável,
// usa uma resposta segura que não afirma data nem valor nenhum.
export function removerFrasesProblematicas(
  texto: string,
  tempo: ContextoTempo,
  autorizados: NumerosAutorizados | null
): string {
  const linhas = texto.split("\n").map((linha) =>
    linha
      .split(/(?<=[.!?])\s+/)
      .filter((frase) => validarResposta(frase, tempo, autorizados).length === 0)
      .join(" ")
  );
  const limpo = linhas.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (limpo.replace(/\[\[[^\]]+\]\]/g, "").trim().length >= 15) return limpo;

  const tipos = new Set(validarResposta(texto, tempo, autorizados).map((p) => p.tipo));
  return tipos.has("valor")
    ? "Essa é uma ótima pergunta! Deixa eu confirmar esse detalhe com precisão e já te retorno. 😊"
    : "Me conta qual dia e horário ficam melhor pra você, que eu já confirmo aqui certinho. 😊";
}
