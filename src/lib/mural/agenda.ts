// Datas da agenda sempre no horário de Brasília (navegador e servidor).

const FUSO = "America/Sao_Paulo";

export function formatarEvento(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: FUSO,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// <input type="datetime-local"> (sem fuso) -> ISO, interpretando como Brasília.
export function localParaIso(valor: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return null;
  const d = new Date(`${valor}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ISO -> valor para <input type="datetime-local"> em Brasília.
export function isoParaLocal(iso: string): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const v = (t: string) => partes.find((p) => p.type === t)?.value ?? "00";
  return `${v("year")}-${v("month")}-${v("day")}T${v("hour") === "24" ? "00" : v("hour")}:${v("minute")}`;
}

// Link "Adicionar ao Google Agenda" (não depende de WhatsApp).
export function linkGoogleAgenda(e: { titulo: string; descricao: string; inicio: string; duracaoMin: number; link: string | null }) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const inicio = new Date(e.inicio);
  const fim = new Date(inicio.getTime() + e.duracaoMin * 60 * 1000);
  const detalhes = [e.descricao, e.link].filter(Boolean).join("\n\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.titulo,
    dates: `${fmt(inicio)}/${fmt(fim)}`,
    details: detalhes,
  });
  if (e.link) params.set("location", e.link);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
