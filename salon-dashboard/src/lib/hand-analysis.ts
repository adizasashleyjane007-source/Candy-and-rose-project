/**
 * AI Hand Analysis — shared types, option lists, prompt and response sanitiser.
 *
 * Used by BOTH the server route (`/api/hand-analysis`) and the client card
 * (`components/HandAnalysisCard.tsx`). It must stay free of server-only and
 * browser-only imports.
 *
 * The skin-tone / nail-shape unions are imported as TYPES ONLY from the
 * Nail Customization page so the lists below can never drift from the app's
 * real options (a mismatch becomes a compile error).
 */
import type { SkinToneKey, NailShape } from "@/app/nails/page";

// ─── Option lists (compile-time checked against the page's real unions) ───────

export const SKIN_TONE_IDS = [
  "fair",
  "light-medium",
  "medium",
  "tan",
  "deep",
] as const satisfies readonly SkinToneKey[];

export const NAIL_SHAPE_IDS = [
  "Almond",
  "Coffin",
  "Square",
  "Squoval",
  "Oval",
  "Stiletto",
  "Round",
] as const satisfies readonly NailShape[];

export const UNDERTONES = ["cool", "warm", "neutral", "olive"] as const;
export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;

// Exhaustiveness: fails to compile if the page adds an option not listed above.
type AssertNever<T extends never> = T;
export type _SkinTonesExhaustive = AssertNever<Exclude<SkinToneKey, (typeof SKIN_TONE_IDS)[number]>>;
export type _NailShapesExhaustive = AssertNever<Exclude<NailShape, (typeof NAIL_SHAPE_IDS)[number]>>;

export type HandSkinTone = SkinToneKey;
export type HandNailShape = NailShape;
export type Undertone = (typeof UNDERTONES)[number];
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

// ─── Limits ───────────────────────────────────────────────────────────────────

export const HAND_ANALYSIS_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const HAND_ANALYSIS_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type HandAnalysisMime = (typeof HAND_ANALYSIS_ALLOWED_MIME)[number];
export const HAND_ANALYSIS_MAX_DIMENSION = 1024; // client-side resize target (px)

// ─── Response types (shared by API + component) ───────────────────────────────

export interface HandAnalysisColor {
  name: string;
  hex: string;
  finish: string;
  why: string;
}

export interface HandAnalysisAvoid {
  name: string;
  why: string;
}

export interface HandAnalysisDesign {
  name: string;
  description: string;
  why: string;
}

export interface HandAnalysisCondition {
  summary: string;
  observations: string[];
  prep: string[];
  seeProfessional: boolean;
}

export interface HandAnalysisResult {
  valid: true;
  skinTone: HandSkinTone;
  undertone: Undertone;
  nailShape: HandNailShape;
  recommendedShapes: HandNailShape[];
  lengthCm: number | null;
  condition: HandAnalysisCondition;
  colors: HandAnalysisColor[];
  avoid: HandAnalysisAvoid[];
  designs: HandAnalysisDesign[];
  confidence: Confidence;
  caveats: string;
}

export interface HandAnalysisInvalid {
  valid: false;
  caveats: string;
}

export type HandAnalysisResponse = HandAnalysisResult | HandAnalysisInvalid;

export interface HandAnalysisErrorBody {
  error: string;
}

/** Payload handed to the Nail Customization page when staff click "Apply to design". */
export interface HandAnalysisApplyPayload {
  skinTone: HandSkinTone;
  nailShape: HandNailShape;
  /** Hex colours to distribute across the five fingers (in order). */
  colors: string[];
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

export const HAND_ANALYSIS_PROMPT_TEMPLATE = `You are a professional nail technician assistant. Analyse the attached photo of a client's hand. Return ONLY JSON in this shape:
{valid, skinTone (one of <SKIN_TONES>), undertone (cool|warm|neutral|olive), nailShape (one of <SHAPES>), recommendedShapes[2-3], lengthCm, condition:{summary, observations[], prep[], seeProfessional:boolean}, colors:[{name,hex,finish,why}] x6, avoid:[{name,why}], designs:[{name,description,why}] x4, confidence (low|medium|high), caveats}
Rules: If the image is not a clear hand with nails return {valid:false,caveats}. Reason from undertone and contrast with the skin. Serve every skin depth equally: never treat light skin as the default, and give vibrant, flattering options for deep tones too. Lighting can distort skin colour: mention it in caveats and trust staff-provided overrides over the photo. Describe nail condition as visible observations only, never diagnose; set seeProfessional true only if something may need medical attention. Keep text short.`;

export interface HandAnalysisOverrides {
  skinTone?: HandSkinTone;
  undertone?: Undertone;
}

/** Builds the final prompt with the app's real option lists and any staff overrides. */
export function buildHandAnalysisPrompt(overrides: HandAnalysisOverrides = {}): string {
  let prompt = HAND_ANALYSIS_PROMPT_TEMPLATE.split("<SKIN_TONES>")
    .join(SKIN_TONE_IDS.join(" | "))
    .split("<SHAPES>")
    .join(NAIL_SHAPE_IDS.join(" | "));

  if (overrides.skinTone) prompt += `\nStaff-confirmed skin tone: ${overrides.skinTone}.`;
  if (overrides.undertone) prompt += `\nStaff-confirmed undertone: ${overrides.undertone}.`;
  return prompt;
}

// ─── Sanitiser ────────────────────────────────────────────────────────────────

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
export const FALLBACK_HEX = "#9CA3AF"; // neutral grey

// Neutral fallbacks (deliberately NOT the lightest skin tone / the default design shape).
const FALLBACK_SKIN_TONE: HandSkinTone = "medium";
const FALLBACK_SHAPE: HandNailShape = "Oval";

const DEFAULT_INVALID_CAVEAT =
  "No clear hand with visible nails was found. Retake the photo in even daylight with fingers spread and nails facing the camera.";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, max = 300): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function strArr(v: unknown, maxItems: number, maxLen = 200): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => str(x, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normaliseKey(v: string): string {
  return v.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

function pickEnum<T extends string>(v: unknown, list: readonly T[]): T | null {
  if (typeof v !== "string") return null;
  const key = normaliseKey(v);
  return list.find((item) => normaliseKey(item) === key) ?? null;
}

export function clampHex(v: unknown): string {
  return typeof v === "string" && HEX_RE.test(v.trim()) ? v.trim().toUpperCase() : FALLBACK_HEX;
}

/** Pulls the JSON object out of a model reply, tolerating markdown fences / stray prose. */
export function extractJsonObject(text: string): unknown {
  const stripped = text.replace(/```(?:json)?/gi, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object found in model reply.");
  return JSON.parse(stripped.slice(start, end + 1));
}

/**
 * Turns untrusted model output into a safe `HandAnalysisResponse`:
 * enums clamped to the app's real lists, hex codes validated, arrays defaulted,
 * and staff overrides always taking priority over the AI's guess.
 */
export function sanitizeHandAnalysis(
  raw: unknown,
  overrides: HandAnalysisOverrides = {}
): HandAnalysisResponse {
  if (!isRecord(raw)) {
    return { valid: false, caveats: DEFAULT_INVALID_CAVEAT };
  }

  const hasUsableData = Boolean(raw.skinTone) || (Array.isArray(raw.colors) && raw.colors.length > 0);
  if (raw.valid === false || !hasUsableData) {
    return { valid: false, caveats: str(raw.caveats, 400) || DEFAULT_INVALID_CAVEAT };
  }

  const aiSkinTone = pickEnum(raw.skinTone, SKIN_TONE_IDS);
  const aiUndertone = pickEnum(raw.undertone, UNDERTONES);
  const nailShape = pickEnum(raw.nailShape, NAIL_SHAPE_IDS) ?? FALLBACK_SHAPE;

  const recommendedShapes: HandNailShape[] = [];
  if (Array.isArray(raw.recommendedShapes)) {
    for (const item of raw.recommendedShapes) {
      const shape = pickEnum(item, NAIL_SHAPE_IDS);
      if (shape && !recommendedShapes.includes(shape)) recommendedShapes.push(shape);
      if (recommendedShapes.length === 3) break;
    }
  }

  const rawLength = typeof raw.lengthCm === "number" ? raw.lengthCm : Number.NaN;
  const lengthCm = Number.isFinite(rawLength) && rawLength >= 0 && rawLength <= 10
    ? Math.round(rawLength * 10) / 10
    : null;

  const cond = isRecord(raw.condition) ? raw.condition : {};
  const condition: HandAnalysisCondition = {
    summary: str(cond.summary, 400),
    observations: strArr(cond.observations, 6),
    prep: strArr(cond.prep, 6),
    seeProfessional: cond.seeProfessional === true,
  };

  const colors: HandAnalysisColor[] = (Array.isArray(raw.colors) ? raw.colors : [])
    .filter(isRecord)
    .slice(0, 6)
    .map((c) => ({
      name: str(c.name, 60) || "Shade",
      hex: clampHex(c.hex),
      finish: str(c.finish, 40),
      why: str(c.why, 240),
    }));

  const avoid: HandAnalysisAvoid[] = (Array.isArray(raw.avoid) ? raw.avoid : [])
    .filter(isRecord)
    .slice(0, 4)
    .map((a) => ({ name: str(a.name, 60) || "Shade", why: str(a.why, 240) }));

  const designs: HandAnalysisDesign[] = (Array.isArray(raw.designs) ? raw.designs : [])
    .filter(isRecord)
    .slice(0, 4)
    .map((d) => ({
      name: str(d.name, 80) || "Design idea",
      description: str(d.description, 240),
      why: str(d.why, 240),
    }));

  return {
    valid: true,
    // Staff overrides always win over the photo-based guess.
    skinTone: overrides.skinTone ?? aiSkinTone ?? FALLBACK_SKIN_TONE,
    undertone: overrides.undertone ?? aiUndertone ?? "neutral",
    nailShape,
    recommendedShapes,
    lengthCm,
    condition,
    colors,
    avoid,
    designs,
    confidence: pickEnum(raw.confidence, CONFIDENCE_LEVELS) ?? "low",
    caveats: str(raw.caveats, 400),
  };
}

// ─── Validation helpers (server) ──────────────────────────────────────────────

/** Detects the real image type from magic bytes — the client-supplied MIME is not trusted. */
export function sniffImageMime(bytes: Uint8Array): HandAnalysisMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function parseSkinOverride(v: unknown): HandSkinTone | undefined {
  return pickEnum(v, SKIN_TONE_IDS) ?? undefined;
}

export function parseUndertoneOverride(v: unknown): Undertone | undefined {
  return pickEnum(v, UNDERTONES) ?? undefined;
}

