import Anthropic from "@anthropic-ai/sdk";
import { ID_TYPES, type IdTypeValue } from "@/lib/id-types";
import type {
  ExtractedIdentity,
  IdExtractionInput,
  IdExtractionProvider,
} from "./types";

/**
 * Reads the card with a vision model.
 *
 * Philippine IDs are a dozen different layouts — PhilSys, UMID, driver's
 * licence, postal, PRC — and plain OCR hands back a jumble of labels in two
 * languages that then has to be untangled with regular expressions. A vision
 * model reads the card the way a clerk does, which is markedly better on a
 * creased laminate photographed at an angle.
 *
 * The trade-off is that the image leaves the building. Weigh that against the
 * Vision provider, which keeps it inside the same Google Cloud project.
 */
export class ClaudeVisionProvider implements IdExtractionProvider {
  readonly id = "claude";
  readonly label = "Vision model";

  isEnabled(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  async read(input: IdExtractionInput): Promise<ExtractedIdentity | null> {
    const client = new Anthropic();

    try {
      const response = await client.messages.create({
        model: process.env.ID_EXTRACTION_MODEL ?? "claude-opus-5-5",
        max_tokens: 1024,
        // Reading fields off a card is not a reasoning problem.
        output_config: { effort: "low" },
        system:
          "You read Philippine government IDs and return only JSON. " +
          "Transcribe exactly what is printed — never infer, correct or " +
          "complete a value you cannot clearly see. Use null for anything " +
          "unreadable, obscured or absent. An honest null is far more useful " +
          "than a confident guess, because a wrong name ends up on a vehicle " +
          "sale document.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType(input.contentType),
                  data: input.image.toString("base64"),
                },
              },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      });

      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("")
        .trim();

      return toIdentity(text, this.id);
    } catch (err) {
      console.error("claude id extraction failed", err);
      return null;
    }
  }
}

const PROMPT = `Return a single JSON object, no prose and no code fence:

{
  "fullName": "the person's name in natural order, First Middle Last",
  "birthDate": "YYYY-MM-DD",
  "idType": one of ${ID_TYPES.join(" | ")},
  "idNumber": "exactly as printed, keeping its dashes or spaces",
  "confidence": 0.0 to 1.0
}

Notes:
- Many cards print the surname first ("DELA CRUZ, JUAN S."). Reorder it to
  natural order and keep particles like "dela" lower case.
- Dates on Philippine IDs are usually month/day/year.
- Set confidence low when the photo is blurred, glared or cropped.
- Use null for any field you cannot read with confidence.`;

/** Anything we can't send is relabelled as JPEG, which covers phone cameras. */
function mediaType(contentType: string): "image/jpeg" | "image/png" | "image/webp" {
  if (contentType === "image/png") return "image/png";
  if (contentType === "image/webp") return "image/webp";
  return "image/jpeg";
}

function toIdentity(text: string, provider: string): ExtractedIdentity | null {
  const json = text.replace(/^```(?:json)?\s*|\s*```$/g, "");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch {
    console.error("claude id extraction returned unparseable output");
    return null;
  }

  const fullName = str(parsed.fullName);
  const birthDate = isoDate(str(parsed.birthDate));
  const idType = idTypeOf(parsed.idType);
  const idNumber = str(parsed.idNumber);

  const filled: ExtractedIdentity["filled"] = [];
  if (fullName) filled.push("fullName");
  if (birthDate) filled.push("birthDate");
  if (idType) filled.push("idType");
  if (idNumber) filled.push("idNumber");

  const stated = Number(parsed.confidence);
  const confidence = Number.isFinite(stated)
    ? Math.min(1, Math.max(0, stated))
    : filled.length / 4;

  return { fullName, birthDate, idType, idNumber, confidence, filled, provider };
}

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.toLowerCase() !== "null" ? trimmed : null;
}

function idTypeOf(value: unknown): IdTypeValue | null {
  if (typeof value !== "string") return null;
  const upper = value.trim().toUpperCase();
  return (ID_TYPES as readonly string[]).includes(upper)
    ? (upper as IdTypeValue)
    : null;
}

/** Keeps an obviously wrong date out of the form. */
function isoDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const thisYear = new Date().getFullYear();
  if (year > thisYear - 16 || year < thisYear - 120) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;

  return value;
}
