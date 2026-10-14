import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { brl, simular, type ConfigSimulador } from "./simulador";

export async function carregarConfigSimulador(): Promise<ConfigSimulador> {
  const admin = createAdminClient();
  const { data } = await admin.from("energia_config").select("*").eq("id", 1).single();
  return {
    descontoPercentual: Number(data?.desconto_percentual ?? 15),
    fatiaConsumoPercentual: Number(data?.fatia_consumo_percentual ?? 75),
    contaMinima: Number(data?.conta_minima ?? 150),
    ufsAtendidas: data?.ufs_atendidas ?? [],
    aviso: data?.aviso ?? "",
  };
}

// As fontes padrão do PDF usam WinAnsi: acentos do português funcionam, mas
// emoji e outros símbolos não. Troca o que não cabe por "?".
function seguro(texto: string) {
  return texto.replace(/[^\x20-\x7E -ÿ\n]/g, "");
}

function quebrarLinhas(texto: string, largura: number, medir: (t: string) => number) {
  const linhas: string[] = [];
  for (const paragrafo of texto.split("\n")) {
    let atual = "";
    for (const palavra of paragrafo.split(" ")) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra;
      if (medir(tentativa) > largura && atual) {
        linhas.push(atual);
        atual = palavra;
      } else {
        atual = tentativa;
      }
    }
    linhas.push(atual);
  }
  return linhas;
}

export async function gerarPropostaPdf(input: {
  valorConta: number;
  uf: string;
  cliente: string;
  consultor: { nome: string; whatsapp: string | null };
  config: ConfigSimulador;
}): Promise<Uint8Array> {
  const r = simular(input.valorConta, input.uf, input.config);
  const pdf = await PDFDocument.create();
  pdf.setTitle("Proposta de economia na conta de luz");
  const page = pdf.addPage([595.28, 841.89]); // A4
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ambar = rgb(0.71, 0.33, 0.04);
  const cinza = rgb(0.35, 0.35, 0.35);
  const margem = 56;
  let y = 841.89 - margem;

  const escrever = (texto: string, tamanho: number, fonte = normal, cor = rgb(0.1, 0.1, 0.1)) => {
    page.drawText(seguro(texto), { x: margem, y, size: tamanho, font: fonte, color: cor });
    y -= tamanho + 8;
  };

  escrever("ATL PROSPECT · ATL ENERGY", 10, negrito, ambar);
  y -= 6;
  escrever("Proposta de economia na conta de luz", 22, negrito);
  if (input.cliente.trim()) escrever(`Preparada para: ${input.cliente.trim().slice(0, 60)}`, 12, normal, cinza);
  escrever(`Data: ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`, 12, normal, cinza);
  y -= 16;

  const linhas: [string, string][] = [
    ["Conta de luz média informada", brl(input.valorConta)],
    ["Estado", input.uf || "Não informado"],
    ["Desconto sobre o consumo", `${input.config.descontoPercentual.toLocaleString("pt-BR")}%`],
    ["Economia estimada por mês", brl(r.economiaMensal)],
    ["Economia estimada em 12 meses", brl(r.economiaAnual)],
  ];
  for (const [rotulo, valor] of linhas) {
    page.drawText(seguro(rotulo), { x: margem, y, size: 12, font: normal, color: cinza });
    page.drawText(seguro(valor), { x: 360, y, size: 13, font: negrito });
    y -= 26;
  }
  y -= 8;

  const destaque = [
    "Sem investimento, sem instalar placas e sem obra.",
    "Sem fidelidade e sem custo de adesão.",
    "Você continua recebendo a conta da distribuidora normalmente.",
  ];
  for (const d of destaque) escrever(`-  ${d}`, 11);
  y -= 10;

  const avisos = [
    input.config.aviso,
    r.abaixoDoMinimo
      ? `Atenção: contas abaixo de ${brl(input.config.contaMinima)} geralmente não atingem o consumo mínimo exigido (acima de 180 kWh por mês).`
      : "",
    r.ufForaDaLista ? "Atenção: a disponibilidade no seu estado precisa ser confirmada." : "",
  ].filter(Boolean);
  for (const aviso of avisos) {
    for (const linha of quebrarLinhas(seguro(aviso), 595.28 - margem * 2, (t) => normal.widthOfTextAtSize(t, 9.5))) {
      page.drawText(linha, { x: margem, y, size: 9.5, font: normal, color: cinza });
      y -= 13;
    }
    y -= 6;
  }

  y = margem + 60;
  page.drawText("Seu consultor", { x: margem, y, size: 10, font: normal, color: cinza });
  y -= 18;
  page.drawText(seguro(input.consultor.nome), { x: margem, y, size: 14, font: negrito });
  if (input.consultor.whatsapp) {
    y -= 18;
    const w = input.consultor.whatsapp.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3");
    page.drawText(`WhatsApp: ${w}`, { x: margem, y, size: 12, font: normal });
  }

  return pdf.save();
}
