import type { MaterialTipo } from "@/lib/types/database.types";

// Usado no browser (upload do admin) e no servidor — nada de server-only aqui.

export const MATERIAIS_BUCKET = "materiais";
// Igual ao file_size_limit do bucket (migration 0029): limite do plano gratuito.
export const MATERIAL_MAX_BYTES = 50 * 1024 * 1024;

export const MATERIAL_TIPOS: MaterialTipo[] = ["pdf", "apresentacao", "imagem", "video"];

export const MATERIAL_TIPO_LABEL: Record<MaterialTipo, string> = {
  pdf: "PDF",
  apresentacao: "Apresentação",
  imagem: "Imagem",
  video: "Vídeo",
};

// MIME aceito por tipo (precisa bater com allowed_mime_types do bucket).
export const MATERIAL_MIMES: Record<MaterialTipo, string[]> = {
  pdf: ["application/pdf"],
  apresentacao: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
  ],
  imagem: ["image/jpeg", "image/png", "image/webp"],
  video: ["video/mp4"],
};

export const MATERIAL_ACCEPT: Record<MaterialTipo, string> = {
  pdf: ".pdf",
  apresentacao: ".pdf,.pptx,.ppt",
  imagem: ".jpg,.jpeg,.png,.webp",
  video: ".mp4",
};

export function formatarTamanho(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Caminho no bucket: <tipo>/<uuid>-<nome-sanitizado>
export function caminhoMaterial(tipo: MaterialTipo, nomeArquivo: string) {
  const nomeSeguro = nomeArquivo.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
  return `${tipo}/${crypto.randomUUID()}-${nomeSeguro}`;
}
