import type { IdTypeValue } from "@/lib/id-types";

/**
 * What we managed to read off a photograph of a government ID.
 *
 * Every field is optional and every field is a *suggestion*. A phone snap of a
 * laminated card under fluorescent light is not a reliable data source, so
 * nothing here is ever written to a submission without the customer seeing it
 * and being able to correct it.
 */
export type ExtractedIdentity = {
  fullName?: string | null;
  /** ISO yyyy-mm-dd, so it drops straight into a date input. */
  birthDate?: string | null;
  idType?: IdTypeValue | null;
  idNumber?: string | null;
  address?: string | null;

  /**
   * Roughly how much of the card we believe we read correctly, 0–1.
   * Drives how insistently the UI asks the customer to check it.
   */
  confidence: number;

  /** Which fields the provider actually found, for the "read from your ID" badges. */
  filled: Array<keyof Omit<ExtractedIdentity, "confidence" | "filled" | "raw" | "provider">>;

  /** The provider's own name, shown to staff but never to the customer. */
  provider: string;

  /** Raw text, kept only for debugging a bad read. Never persisted. */
  raw?: string;
};

export type IdExtractionInput = {
  image: Buffer;
  contentType: string;
};

export interface IdExtractionProvider {
  readonly id: string;
  readonly label: string;
  /** False when the provider has no credentials; it is then skipped. */
  isEnabled(): boolean;
  read(input: IdExtractionInput): Promise<ExtractedIdentity | null>;
}

export const EMPTY_EXTRACTION: ExtractedIdentity = {
  confidence: 0,
  filled: [],
  provider: "none",
};
