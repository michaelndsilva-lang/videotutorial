import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

// Transcreve o áudio (nota de voz) de um lead usando o Gemini, que entende
// áudio nativamente — não é uma chamada ao AI Gateway (usado pelo resto do
// agente) porque o Gemini foi configurado com sua própria API key.
export async function transcreverAudioDoLead(base64: string, mimetype: string): Promise<string> {
  const { text } = await generateText({
    model: google("gemini-3.6-flash"),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Transcreva fielmente o que a pessoa está falando neste áudio, em português. Responda apenas com a transcrição, sem comentários adicionais.",
          },
          {
            type: "file",
            mediaType: mimetype.split(";")[0].trim(),
            data: base64,
          },
        ],
      },
    ],
  });

  return text.trim();
}
