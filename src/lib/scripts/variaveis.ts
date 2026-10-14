// Variáveis dos scripts (usado no navegador do membro e no admin).

export const VARIAVEIS = [
  { chave: "{nome_lead}", descricao: "Nome do contato (o membro digita na hora)" },
  { chave: "{meu_nome}", descricao: "Nome do membro" },
  { chave: "{meu_link}", descricao: "Link de cadastro (recrutamento) do membro" },
  { chave: "{link_energia}", descricao: "Link de energia do membro" },
] as const;

export type ValoresScript = {
  nomeLead: string;
  meuNome: string;
  meuLink: string;
  linkEnergia: string;
};

// Sem nome do lead, tira o placeholder junto da vírgula/espaço que o precede
// ("Oi, {nome_lead}!" -> "Oi!") em vez de deixar "Oi, !". Links vazios ficam
// como placeholder visível para o membro perceber que falta preencher.
export function aplicarVariaveis(texto: string, v: ValoresScript): string {
  let resultado = texto;
  const nome = v.nomeLead.trim();
  if (nome) {
    resultado = resultado.replaceAll("{nome_lead}", nome);
  } else {
    resultado = resultado
      .split("\n")
      .map((linha) => {
        if (!linha.includes("{nome_lead}")) return linha;
        const comecava = linha.trimStart().startsWith("{nome_lead}");
        let nova = linha.replace(/[, \t]*\{nome_lead\}/g, "");
        if (comecava) {
          nova = nova.replace(/^[, \t]+/, "").replace(/^\p{Ll}/u, (c) => c.toUpperCase());
        }
        return nova;
      })
      .join("\n");
  }
  if (v.meuNome.trim()) resultado = resultado.replaceAll("{meu_nome}", v.meuNome.trim());
  if (v.meuLink.trim()) resultado = resultado.replaceAll("{meu_link}", v.meuLink.trim());
  if (v.linkEnergia.trim()) resultado = resultado.replaceAll("{link_energia}", v.linkEnergia.trim());
  return resultado;
}

// Placeholders que continuam no texto depois de aplicar (ex.: link não preenchido).
export function variaveisPendentes(texto: string): string[] {
  return Array.from(new Set(texto.match(/\{(meu_nome|meu_link|link_energia)\}/g) ?? []));
}

// wa.me aceita número com DDI; sem número, abre a escolha de contato.
export function linkWhatsapp(texto: string, telefone: string) {
  let digitos = telefone.replace(/\D/g, "");
  if (digitos && digitos.length <= 11) digitos = `55${digitos}`;
  const base = digitos ? `https://wa.me/${digitos}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(texto)}`;
}
