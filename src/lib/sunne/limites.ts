// Compartilhado entre browser (validação antes do upload) e servidor.
// O bucket `sunne` também tem teto de 25 MB. Vídeo fica em 16 MB porque é o
// limite prático do WhatsApp para vídeo enviado como mídia.
export const SUNNE_BUCKET = "sunne";
export const SUNNE_PDF_MAX_BYTES = 20 * 1024 * 1024;
export const SUNNE_VIDEO_MAX_BYTES = 16 * 1024 * 1024;
