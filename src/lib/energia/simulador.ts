// Cálculo do simulador (navegador e servidor). Regra decidida pelo admin em
// 2026-10-14: o desconto vale sobre o consumo, então a economia estimada é
// conta × fatia do consumo × desconto.

export type ConfigSimulador = {
  descontoPercentual: number;
  fatiaConsumoPercentual: number;
  contaMinima: number;
  ufsAtendidas: string[];
  aviso: string;
};

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export type ResultadoSimulacao = {
  economiaMensal: number;
  economiaAnual: number;
  abaixoDoMinimo: boolean;
  ufForaDaLista: boolean;
};

export function simular(valorConta: number, uf: string, config: ConfigSimulador): ResultadoSimulacao {
  const valor = Number.isFinite(valorConta) && valorConta > 0 ? valorConta : 0;
  const economiaMensal =
    Math.round(valor * (config.fatiaConsumoPercentual / 100) * (config.descontoPercentual / 100) * 100) / 100;
  return {
    economiaMensal,
    economiaAnual: Math.round(economiaMensal * 12 * 100) / 100,
    abaixoDoMinimo: valor > 0 && valor < config.contaMinima,
    ufForaDaLista: config.ufsAtendidas.length > 0 && !!uf && !config.ufsAtendidas.includes(uf),
  };
}

export function brl(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// "1.234,56" / "1234.56" / "R$ 300" -> número
export function lerValor(texto: string): number {
  const limpo = texto.replace(/[^\d,.-]/g, "");
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : 0;
}
