/**
 * Framing guides for the photo step.
 *
 * Each empty slot shows a faint line drawing of the shot we're asking for.
 * Customers photograph a car the way they'd photograph a pet — too close, at a
 * strange angle, half of it out of frame — and a picture of the intended
 * framing corrects that faster than any amount of hint text.
 *
 * Drawn on a 120×90 canvas so they sit in the 4:3 slot without distortion.
 */

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Dashed baseline — reads as "stand back and get the whole thing in". */
function Ground() {
  return (
    <path
      d="M10 80 H110"
      {...S}
      strokeWidth={2}
      strokeDasharray="5 6"
      opacity={0.55}
    />
  );
}

function SideProfile({ flip = false }: { flip?: boolean }) {
  return (
    <g transform={flip ? "translate(120,0) scale(-1,1)" : undefined}>
      <path
        d="M13 66 V56 C13 51 16 48 21 47 L36 44 L48 31 C50 28 53 27 57 27 H78 C82 27 85 28 87 31 L96 44 L106 47 C110 48 112 51 112 56 V66"
        {...S}
      />
      <path
        d="M41 43 L50 32 C51 31 52 30.5 54 30.5 H78 C80 30.5 81 31 82 32 L89 43 Z"
        {...S}
        strokeWidth={2}
      />
      <path d="M65 43 V60" {...S} strokeWidth={2} />
      <circle cx="34" cy="66" r="8.5" {...S} />
      <circle cx="90" cy="66" r="8.5" {...S} />
    </g>
  );
}

function FrontFace({ rear = false }: { rear?: boolean }) {
  return (
    <>
      {/* cabin and glass */}
      <path d="M35 45 L41 28 C42 26 44 25 47 25 H73 C76 25 78 26 79 28 L85 45" {...S} />
      <path
        d="M40 43 L45.5 29.5 C46 28.5 46.5 28 48 28 H72 C73.5 28 74 28.5 74.5 29.5 L80 43 Z"
        {...S}
        strokeWidth={2}
      />
      {/* body */}
      <path
        d="M23 65 V51 C23 47 26 45 30 44 L35 45 H85 L90 44 C94 45 97 47 97 51 V65"
        {...S}
      />
      {/* mirrors */}
      <path d="M23 49 L17 51" {...S} strokeWidth={2} />
      <path d="M97 49 L103 51" {...S} strokeWidth={2} />
      {rear ? (
        <>
          <rect x="26" y="47" width="14" height="10" rx="2.5" {...S} strokeWidth={2} />
          <rect x="80" y="47" width="14" height="10" rx="2.5" {...S} strokeWidth={2} />
          <rect x="50" y="52" width="20" height="9" rx="2" {...S} strokeWidth={2} />
        </>
      ) : (
        <>
          <rect x="27" y="47" width="13" height="6" rx="3" {...S} strokeWidth={2} />
          <rect x="80" y="47" width="13" height="6" rx="3" {...S} strokeWidth={2} />
          <rect x="43" y="53" width="34" height="8" rx="3" {...S} strokeWidth={2} />
        </>
      )}
      <path d="M27 65 H93" {...S} strokeWidth={2} />
    </>
  );
}

const GUIDES: Record<string, React.ReactNode> = {
  FRONT_34: (
    <>
      <FrontFace />
      <Ground />
    </>
  ),

  REAR_34: (
    <>
      <FrontFace rear />
      <Ground />
    </>
  ),

  LEFT_SIDE: (
    <>
      <SideProfile />
      <Ground />
    </>
  ),

  RIGHT_SIDE: (
    <>
      <SideProfile flip />
      <Ground />
    </>
  ),

  DASH_ODOMETER: (
    <>
      <rect x="16" y="20" width="88" height="52" rx="9" {...S} />
      <circle cx="45" cy="44" r="16" {...S} strokeWidth={2} />
      <path d="M45 44 L56 35" {...S} strokeWidth={2} />
      <circle cx="82" cy="44" r="11" {...S} strokeWidth={2} />
      <rect x="33" y="60" width="26" height="8" rx="2" {...S} strokeWidth={2} />
      <path d="M38 64 H54" {...S} strokeWidth={2} opacity={0.6} />
    </>
  ),

  INTERIOR_FRONT: (
    <>
      <path d="M12 18 H108" {...S} strokeWidth={2} opacity={0.6} />
      <path d="M12 44 C40 34 80 34 108 44" {...S} />
      <circle cx="40" cy="57" r="15" {...S} />
      <path d="M40 42 V57 M27 64 L40 57 M53 64 L40 57" {...S} strokeWidth={2} />
      <rect x="68" y="44" width="30" height="20" rx="3" {...S} strokeWidth={2} />
      <path d="M12 76 H108" {...S} strokeWidth={2} opacity={0.6} />
    </>
  ),

  INTERIOR_REAR: (
    <>
      <rect x="26" y="20" width="20" height="11" rx="5.5" {...S} strokeWidth={2} />
      <path d="M20 72 V42 C20 36 24 31 30 31 H42 C48 31 52 36 52 42 V72" {...S} />
      <rect x="74" y="20" width="20" height="11" rx="5.5" {...S} strokeWidth={2} />
      <path d="M68 72 V42 C68 36 72 31 78 31 H90 C96 31 100 36 100 42 V72" {...S} />
      <path d="M12 72 H108" {...S} strokeWidth={2} opacity={0.6} />
    </>
  ),

  ENGINE_BAY: (
    <>
      <path d="M12 32 L40 13 L47 18 L20 37" {...S} strokeWidth={2} />
      <rect x="18" y="38" width="86" height="40" rx="6" {...S} />
      <rect x="34" y="47" width="38" height="22" rx="3" {...S} strokeWidth={2} />
      <circle cx="86" cy="58" r="8" {...S} strokeWidth={2} />
      <circle cx="26" cy="47" r="4" {...S} strokeWidth={2} />
    </>
  ),

  TIRES: (
    <>
      <circle cx="60" cy="45" r="30" {...S} />
      <circle cx="60" cy="45" r="14" {...S} strokeWidth={2} />
      <circle cx="60" cy="45" r="4" {...S} strokeWidth={2} />
      <path
        d="M60 15 V22 M60 68 V75 M30 45 H37 M83 45 H90 M39 24 L44 29 M76 61 L81 66 M81 24 L76 29 M44 61 L39 66"
        {...S}
        strokeWidth={2}
        opacity={0.75}
      />
    </>
  ),

  DAMAGE: (
    <>
      <g opacity={0.5}>
        <SideProfile />
      </g>
      <circle
        cx="68"
        cy="48"
        r="17"
        {...S}
        strokeWidth={2.2}
        strokeDasharray="5 5"
      />
      <path d="M64 39 L71 47 L64 50 L72 58" {...S} strokeWidth={2.4} />
    </>
  ),

  DOC_CR: (
    <>
      <rect x="29" y="12" width="62" height="66" rx="5" {...S} />
      <path
        d="M40 28 H80 M40 38 H80 M40 48 H68"
        {...S}
        strokeWidth={2}
        opacity={0.8}
      />
      <circle cx="74" cy="63" r="9" {...S} strokeWidth={2} />
      <path d="M40 60 H58 M40 69 H52" {...S} strokeWidth={2} opacity={0.55} />
    </>
  ),

  DOC_ID: (
    <>
      <rect x="20" y="25" width="80" height="50" rx="6" {...S} />
      <rect x="30" y="35" width="23" height="29" rx="3" {...S} strokeWidth={2} />
      <circle cx="41.5" cy="44" r="5" {...S} strokeWidth={2} />
      <path d="M33 61 C35 55 48 55 50 61" {...S} strokeWidth={2} />
      <path
        d="M62 40 H90 M62 50 H90 M62 60 H80"
        {...S}
        strokeWidth={2}
        opacity={0.8}
      />
    </>
  ),

  OTHER: (
    <>
      <g opacity={0.75}>
        <SideProfile />
      </g>
      <Ground />
    </>
  ),
};

// The OR is the same shape of document as the CR.
GUIDES.DOC_OR = GUIDES.DOC_CR;

/**
 * The framing guide for a slot, or null when we have no drawing for it.
 * Decorative: the slot's label and hint already carry the meaning.
 */
export function SlotGuide({
  slot,
  className = "",
}: {
  slot: string;
  className?: string;
}) {
  const guide = GUIDES[slot];
  if (!guide) return null;

  return (
    <svg
      viewBox="0 0 120 90"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {guide}
    </svg>
  );
}
