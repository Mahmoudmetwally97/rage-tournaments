import { z } from 'zod';
import type { ExtractedScreenshot } from './types';

const rowSchema = z.object({
  name: z.string().min(1),
  rank: z.number().int().nullable().optional().default(null),
  kills: z.number().int().nullable().optional().default(null),
  deaths: z.number().int().nullable().optional(),
  score: z.number().nullable().optional(),
  confidence: z.number().min(0).max(1).default(0.5)
});

export const extractedSchema = z.object({
  is_results_screen: z.boolean(),
  room: z.string().nullable().optional().default(null),
  round: z.number().int().nullable().optional().default(null),
  mode: z.string().nullable().optional().default(null),
  rows: z.array(rowSchema).default([]),
  overall_confidence: z.number().min(0).max(1).default(0),
  notes: z.string().optional()
});

export const VISION_PROMPT = `You read a screenshot of an online shooter (CrossFire) room/lobby result screen for a tournament.
Return ONLY JSON with this shape:
{"is_results_screen":bool,"room":string|null,"round":int|null,"mode":string|null,
 "rows":[{"name":string,"rank":int|null,"kills":int|null,"deaths":int|null,"score":number|null,"confidence":0..1}],
 "overall_confidence":0..1,"notes":string}
Rules:
- is_results_screen=false if the image is not a final results / scoreboard (chat, lobby, loading, meme, etc.). Then rows=[].
- One row per player, in on-screen order. rank is the final placement shown (1 = best). If no rank column, infer it from the order or score ONLY if the order is clearly a ranking, otherwise null.
- name: copy the in-game nickname exactly as printed, including case. Do not guess letters you cannot read; lower that row's confidence instead.
- Arabic digits must be converted to normal integers. Never invent rows or numbers.
- room/round: only if printed on the screen (e.g. "Room 3", "غرفة 3", "Round 2"), else null.
- confidence per row: 1 = every character and number clearly legible, below 0.6 = blurry/cropped/partly hidden.
- overall_confidence: how sure you are the whole table is complete and correctly read.`;

async function toBase64(url: string): Promise<{ data: string; mime: string; bytes: Uint8Array }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`IMAGE_FETCH_${res.status}`);
  const mime = (res.headers.get('content-type') ?? 'image/png').split(';')[0]!;
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > 12 * 1024 * 1024) throw new Error('IMAGE_TOO_LARGE');
  return { data: Buffer.from(buf).toString('base64'), mime, bytes: buf };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function parseJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

async function callGemini(img: { data: string; mime: string }): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('NO_VISION_KEY');
  const model = process.env.VISION_MODEL || 'gemini-2.5-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: VISION_PROMPT }, { inline_data: { mime_type: img.mime, data: img.data } }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' }
    })
  });
  if (!res.ok) throw new Error(`VISION_${res.status}`);
  const j = (await res.json()) as any;
  return j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
}

async function callOpenAI(img: { data: string; mime: string }): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('NO_VISION_KEY');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.VISION_MODEL || 'gpt-4.1-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: [
        { type: 'text', text: VISION_PROMPT },
        { type: 'image_url', image_url: { url: `data:${img.mime};base64,${img.data}` } }
      ] }]
    })
  });
  if (!res.ok) throw new Error(`VISION_${res.status}`);
  const j = (await res.json()) as any;
  return j?.choices?.[0]?.message?.content ?? '';
}

export async function readScreenshot(imageUrl: string): Promise<{ extracted: ExtractedScreenshot; sha256: string }> {
  const img = await toBase64(imageUrl);
  const sha256 = await sha256Hex(img.bytes);
  const provider = (process.env.VISION_PROVIDER || 'gemini').toLowerCase();
  let text = await (provider === 'openai' ? callOpenAI(img) : callGemini(img));
  let parsed = extractedSchema.safeParse(safe(text));
  if (!parsed.success) {
    text = await (provider === 'openai' ? callOpenAI(img) : callGemini(img)); // one retry
    parsed = extractedSchema.safeParse(safe(text));
  }
  if (!parsed.success) throw new Error('VISION_BAD_JSON');
  return { extracted: parsed.data as ExtractedScreenshot, sha256 };
}

function safe(t: string): unknown {
  try { return parseJson(t); } catch { return null; }
}
