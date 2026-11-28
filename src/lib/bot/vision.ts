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
  screen_type: z.enum(['results', 'lobby', 'other']).optional(),
  map: z.string().nullable().optional().default(null),
  room: z.string().nullable().optional().default(null),
  round: z.number().int().nullable().optional().default(null),
  mode: z.string().nullable().optional().default(null),
  rows: z.array(rowSchema).default([]),
  overall_confidence: z.number().min(0).max(1).default(0),
  notes: z.string().optional()
});

export const VISION_PROMPT = `You read a screenshot of an online shooter (CrossFire) room/lobby result screen for a tournament.
Return ONLY JSON with this shape:
{"screen_type":"results"|"lobby"|"other","is_results_screen":bool,"map":string|null,"room":string|null,"round":int|null,"mode":string|null,
 "rows":[{"name":string,"rank":int|null,"kills":int|null,"deaths":int|null,"score":number|null,"confidence":0..1}],
 "overall_confidence":0..1,"notes":string}
Rules:
- screen_type: "results" for any scoreboard table with columns like Ranking / Call Sign / Clan name / Kill/Death / Ping or a final results screen. This includes the in-game TAB scoreboard drawn over gameplay (HUD, timer, minimap visible behind it): if the table is there, it is "results". "lobby" for a pre-game room lobby (player list with Join / Ready / Start button, room info with mode and map, before the match starts). "other" only when there is no such player table (plain gameplay, chat, loading, meme).
- is_results_screen=true only when screen_type is "results". For "other", rows=[].
- For a "lobby": rows = one row per player name in the player list (rank, kills, deaths, score = null). Copy names exactly, without the clan tag icons. room = the room number if printed anywhere (e.g. the chat line "You have joined room [22]" or the room title), mode = the game mode as shown (e.g. "Free For All"), map = the map name as shown.
- One row per player, in on-screen order. rank is the placement shown (1 = best): ACE = 1, 2nd = 2, 3rd = 3, then by order when the list is sorted by kills. If no rank column, infer it from the order or score ONLY if the order is clearly a ranking, otherwise null.
- Kill/Death column: kills = first number, deaths = second number. Highlighted rows (the viewer's own row), colored rows and rows partly covered by an overlay are still rows: read them, and lower that row's confidence if any digit is hidden.
- name: copy the in-game nickname exactly as printed, including case. Do not guess letters you cannot read; lower that row's confidence instead.
- Arabic digits must be converted to normal integers. Never invent rows or numbers.
- room/round: only a room NUMBER printed on the screen (e.g. "Room 3", "غرفة 3", "joined room [22]") or a round ("Round 2"), else null. A channel or event title such as "RAGE GAMES EU-Channel 3 GM Event #1" is NOT a room: use null.
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
  const j = JSON.parse(cleaned);
  return Array.isArray(j) ? j[0] : j; // some models wrap the object in a one-item array
}

async function callGemini(img: { data: string; mime: string }): Promise<string> {
  // The main model is sometimes overloaded (503/429): retry it, then fall back to a second model.
  const primary = process.env.VISION_MODEL || 'gemini-3.5-flash';
  const models = [primary, 'gemini-3-flash-preview', primary, 'gemini-3-flash-preview'];
  let last = 'VISION_ERROR';
  for (let i = 0; i < models.length; i++) {
    try {
      try { return await callGeminiModel(img, models[i]!, true); }
      catch (e0) { if (e0 instanceof Error && e0.message === 'VISION_400') return await callGeminiModel(img, models[i]!, false); throw e0; }
    } catch (e) {
      last = e instanceof Error ? e.message : 'VISION_ERROR';
      if (!/VISION_(429|500|502|503|504)|aborted|timeout/i.test(last)) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw new Error(last);
}

async function callGeminiModel(img: { data: string; mime: string }, model: string, minimalThinking: boolean): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('NO_VISION_KEY');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    signal: AbortSignal.timeout(25_000),
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: VISION_PROMPT }, { inline_data: { mime_type: img.mime, data: img.data } }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json', ...(minimalThinking ? { thinkingConfig: { thinkingLevel: 'minimal' } } : {}) }
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
  const d = parsed.data;
  if (d.screen_type === 'lobby') d.is_results_screen = false;
  return { extracted: d as ExtractedScreenshot, sha256 };
}

function safe(t: string): unknown {
  try { return parseJson(t); } catch { return null; }
}
