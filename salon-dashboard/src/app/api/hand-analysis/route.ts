import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import {
  HAND_ANALYSIS_ALLOWED_MIME,
  HAND_ANALYSIS_MAX_BYTES,
  buildHandAnalysisPrompt,
  extractJsonObject,
  parseSkinOverride,
  parseUndertoneOverride,
  sanitizeHandAnalysis,
  sniffImageMime,
  type HandAnalysisErrorBody,
  type HandAnalysisResponse,
} from "@/lib/hand-analysis";

// Server-only: uses the Google Gen AI SDK and a secret API key.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const FRIENDLY_FAILURE = "Hand analysis is temporarily unavailable. Please try again in a moment.";

function fail(message: string, status: number) {
  return NextResponse.json<HandAnalysisErrorBody>({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  // ── 1. Admin session (same check the other /api routes use; /api is exempt from proxy.ts) ──
  let supabase;
  try {
    supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return fail("Authentication required.", 401);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = (profile?.role || "").toLowerCase();
    if (!["administrator", "admin", "staff"].includes(role)) {
      return fail("Unauthorized: only admin and staff can use hand analysis.", 403);
    }
  } catch (err) {
    console.error("[HAND ANALYSIS] Auth check failed:", err instanceof Error ? err.message : "unknown");
    return fail("Could not verify your session. Please sign in again.", 401);
  }

  // ── 2. Server configuration ──
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[HAND ANALYSIS] GEMINI_API_KEY is not set.");
    return fail("AI hand analysis is not configured yet. Please contact the administrator.", 503);
  }

  // ── 3. Parse + validate the upload ──
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Invalid upload. Please send the photo as multipart form data.", 400);
  }

  const image = form.get("image");
  if (!(image instanceof File)) {
    return fail("Please attach a hand photo.", 400);
  }
  if (image.size === 0) {
    return fail("The uploaded photo is empty.", 400);
  }
  if (image.size > HAND_ANALYSIS_MAX_BYTES) {
    return fail("Photo is too large. The maximum size is 5 MB.", 413);
  }
  if (image.type && !(HAND_ANALYSIS_ALLOWED_MIME as readonly string[]).includes(image.type)) {
    return fail("Unsupported file type. Please upload a JPG, PNG or WebP photo.", 415);
  }

  const bytes = new Uint8Array(await image.arrayBuffer());
  const mediaType = sniffImageMime(bytes);
  if (!mediaType) {
    return fail("Unsupported file type. Please upload a JPG, PNG or WebP photo.", 415);
  }

  const rawSkin = form.get("skinOverride");
  const rawUndertone = form.get("undertoneOverride");
  const skinOverride = typeof rawSkin === "string" && rawSkin.trim() ? parseSkinOverride(rawSkin) : undefined;
  const undertoneOverride =
    typeof rawUndertone === "string" && rawUndertone.trim() ? parseUndertoneOverride(rawUndertone) : undefined;

  if (typeof rawSkin === "string" && rawSkin.trim() && !skinOverride) {
    return fail("Unknown skin tone override.", 400);
  }
  if (typeof rawUndertone === "string" && rawUndertone.trim() && !undertoneOverride) {
    return fail("Unknown undertone override.", 400);
  }

  // ── 4. Ask the model (the photo lives only in memory for this request; nothing is stored) ──
  try {
    const ai = new GoogleGenAI({ apiKey });

    const promptText = buildHandAnalysisPrompt({
      skinTone: skinOverride,
      undertone: undertoneOverride,
    });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          inlineData: {
            mimeType: mediaType,
            data: Buffer.from(bytes).toString("base64"),
          },
        },
        promptText,
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "";

    const result = sanitizeHandAnalysis(extractJsonObject(text), {
      skinTone: skinOverride,
      undertone: undertoneOverride,
    });

    return NextResponse.json<HandAnalysisResponse>(result);
  } catch (err) {
    // Log the reason only — never the image or the API key.
    console.error(
      "[HAND ANALYSIS] Model call failed:",
      err instanceof Error ? `${err.name}: ${err.message}` : "unknown error"
    );
    return fail(FRIENDLY_FAILURE, 502);
  }
}

