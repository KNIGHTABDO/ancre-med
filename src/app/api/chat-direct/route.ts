import { NextRequest } from "next/server";
import { withGeminiRetry } from "@/lib/geminiRetry";
import { GoogleGenAI } from "@google/genai";
import { serviceTierConfig } from "@/lib/serviceTier";

export const runtime = "nodejs";

const DIRECT_MODEL = "gemini-3.1-flash-lite";

const DIRECT_INSTRUCTION = `
Tu es l'assistant d'AncreMed, un outil pédagogique pour étudiants en médecine français.
Le message de l'utilisateur est conversationnel (salutation, remerciement, bavardage).
Réponds directement, chaleureusement et brièvement en français (1 à 3 phrases).
Ne fais aucune affirmation clinique ou pharmacologique.
Si le message n'a aucun rapport avec la médecine, indique poliment que tu es un assistant
dédié aux sujets médicaux et EDN français.
Réponds en texte brut, sans JSON ni markdown lourd.
`.trim();

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

export async function POST(request: NextRequest): Promise<Response> {
  let prompt: string;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const raw = body["prompt"];
    if (typeof raw !== "string" || raw.trim().length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Missing prompt." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    prompt = raw.trim();
  } catch (error: unknown) {
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const aiStudio = new GoogleGenAI({ apiKey: getRequiredEnv("GEMINI_API_KEY") });
    const stream = await withGeminiRetry(() => aiStudio.models.generateContentStream({
      model: DIRECT_MODEL,
      contents: prompt,
      config: {
        ...serviceTierConfig(),
        systemInstruction: DIRECT_INSTRUCTION,
        temperature: 0.6,
      },
    }));

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text;
            if (typeof text === "string" && text.length > 0) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
