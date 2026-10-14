// youtube.com/watch?v=, youtu.be/, /shorts/, /embed/, /live/ -> id de 11 caracteres.
export function extrairYoutubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i
  );
  return m ? m[1] : null;
}
