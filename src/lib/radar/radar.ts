// Classificação do radar (navegador e servidor). Regra do roteiro: verde =
// atividade nos últimos 2 dias, amarelo = 3 a 5 dias, vermelho = mais de 5.

export type CorRadar = "verde" | "amarelo" | "vermelho";

export const COR_LABEL: Record<CorRadar, string> = {
  verde: "Ativo",
  amarelo: "Esfriando",
  vermelho: "Parado",
};

export const COR_CLASSE: Record<CorRadar, string> = {
  verde: "bg-emerald-500",
  amarelo: "bg-amber-500",
  vermelho: "bg-red-500",
};

const DIA = 24 * 60 * 60 * 1000;

export function diasDesde(iso: string | null, agora: number): number | null {
  if (!iso) return null;
  return Math.floor((agora - new Date(iso).getTime()) / DIA);
}

export function corRadar(dias: number): CorRadar {
  if (dias <= 2) return "verde";
  if (dias <= 5) return "amarelo";
  return "vermelho";
}

export const CATEGORIA_AJUDA: Record<string, string> = {
  abordagem: "Abordagem",
  objecao: "Objeção",
  plataforma: "Uso da plataforma",
  energia: "Energia",
  produtos: "Produtos",
  outro: "Outro",
};

export const STATUS_AJUDA: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  resolvido: "Resolvido",
};

export function linkWhatsappNumero(numero: string | null, texto?: string) {
  if (!numero) return null;
  let d = numero.replace(/\D/g, "");
  if (d.length <= 11) d = `55${d}`;
  return `https://wa.me/${d}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}
