/**
 * IOC (International Olympic Committee) to ISO 3166-1 alpha-2 country code mapping.
 *
 * Tennis datasets (e.g. JeffSackmann) use IOC 3-letter codes, but flag emoji/image
 * libraries expect ISO 2-letter codes. This module bridges that gap.
 */

/**
 * Mapping from IOC 3-letter country codes to lowercase ISO 3166-1 alpha-2 codes.
 *
 * Includes all Olympic nations whose IOC code differs from their ISO alpha-2 code,
 * plus common 3-letter codes that map directly (e.g. USA → us).
 */
export const IOC_TO_ISO: Record<string, string> = {
  // ── Americas ──────────────────────────────────────────────────────────────
  USA: "us",
  CAN: "ca",
  MEX: "mx",
  BRA: "br",
  ARG: "ar",
  COL: "co",
  PER: "pe",
  VEN: "ve",
  CHI: "cl",
  ECU: "ec",
  URU: "uy",
  PAR: "py",
  BOL: "bo",
  GUY: "gy",
  SUR: "sr",
  DOM: "do",
  PUR: "pr",
  CRC: "cr",
  GUA: "gt",
  HON: "hn",
  ESA: "sv",
  NCA: "ni",
  PAN: "pa",
  JAM: "jm",
  TTO: "tt",
  CUB: "cu",
  HAI: "ht",
  BAH: "bs",
  BAR: "bb",
  BER: "bm",
  ANT: "ag",
  SKN: "kn",
  LCA: "lc",
  VIN: "vc",
  GRN: "gd",
  DMA: "dm",
  BIZ: "bz",
  ARU: "aw",
  CAY: "ky",
  IVB: "vg",
  ISV: "vi",

  // ── Europe ────────────────────────────────────────────────────────────────
  GBR: "gb",
  FRA: "fr",
  GER: "de",
  ESP: "es",
  ITA: "it",
  POR: "pt",
  NED: "nl",
  BEL: "be",
  SUI: "ch",
  AUT: "at",
  POL: "pl",
  CZE: "cz",
  SVK: "sk",
  HUN: "hu",
  ROU: "ro",
  BUL: "bg",
  SRB: "rs",
  CRO: "hr",
  SLO: "si",
  BIH: "ba",
  MKD: "mk",
  MNE: "me",
  ALB: "al",
  KOS: "xk",
  GRE: "gr",
  TUR: "tr",
  CYP: "cy",
  RUS: "ru",
  UKR: "ua",
  BLR: "by",
  MDA: "md",
  LAT: "lv",
  LTU: "lt",
  EST: "ee",
  GEO: "ge",
  ARM: "am",
  AZE: "az",
  DEN: "dk",
  FIN: "fi",
  NOR: "no",
  SWE: "se",
  ISL: "is",
  IRL: "ie",
  LUX: "lu",
  MON: "mc",
  AND: "ad",
  LIE: "li",
  SMR: "sm",
  MLT: "mt",

  // ── Asia ───────────────────────────────────────────────────────────────────
  JPN: "jp",
  CHN: "cn",
  KOR: "kr",
  PRK: "kp",
  TPE: "tw",
  IND: "in",
  PAK: "pk",
  SRI: "lk",
  BAN: "bd",
  NEP: "np",
  MAS: "my",
  INA: "id",
  PHI: "ph",
  SIN: "sg",
  THA: "th",
  VIE: "vn",
  MYA: "mm",
  CAM: "kh",
  LAO: "la",
  BRU: "bn",
  TLS: "tl",
  MGL: "mn",
  KAZ: "kz",
  UZB: "uz",
  TKM: "tm",
  KGZ: "kg",
  TJK: "tj",
  IRI: "ir",
  IRQ: "iq",
  UAE: "ae",
  KSA: "sa",
  QAT: "qa",
  BRN: "bh",
  KUW: "kw",
  OMA: "om",
  YEM: "ye",
  SYR: "sy",
  JOR: "jo",
  LBN: "lb",
  PLE: "ps",
  ISR: "il",
  AFG: "af",
  HKG: "hk",
  MAC: "mo",

  // ── Africa ─────────────────────────────────────────────────────────────────
  RSA: "za",
  EGY: "eg",
  NGR: "ng",
  KEN: "ke",
  ETH: "et",
  GHA: "gh",
  CMR: "cm",
  CIV: "ci",
  SEN: "sn",
  ALG: "dz",
  MAR: "ma",
  TUN: "tn",
  LBA: "ly",
  SUD: "sd",
  UGA: "ug",
  TAN: "tz",
  RWA: "rw",
  MOZ: "mz",
  ANG: "ao",
  ZIM: "zw",
  ZAM: "zm",
  BOT: "bw",
  NAM: "na",
  MAW: "mw",
  MLI: "ml",
  BUR: "bf",
  NIG: "ne",
  BEN: "bj",
  TOG: "tg",
  GAB: "ga",
  CGO: "cg",
  COD: "cd",
  MTN: "mr",
  GUI: "gn",
  GBS: "gw",
  CPV: "cv",
  GAM: "gm",
  SLE: "sl",
  LBR: "lr",
  ERI: "er",
  DJI: "dj",
  SOM: "so",
  MAD: "mg",
  MRI: "mu",
  SEY: "sc",
  COM: "km",
  SWZ: "sz",
  LES: "ls",
  CHA: "td",
  CAF: "cf",
  GEQ: "gq",
  STP: "st",
  BDI: "bi",
  SSD: "ss",

  // ── Oceania ────────────────────────────────────────────────────────────────
  AUS: "au",
  NZL: "nz",
  FIJ: "fj",
  PNG: "pg",
  SAM: "ws",
  TGA: "to",
  VAN: "vu",
  SOL: "sb",
  FSM: "fm",
  PLW: "pw",
  MHL: "mh",
  KIR: "ki",
  TUV: "tv",
  NRU: "nr",
  COK: "ck",
  ASA: "as",
  GUM: "gu",
};

/**
 * Convert an IOC 3-letter country code to a lowercase ISO 3166-1 alpha-2 code.
 *
 * - Looks up the IOC code in the mapping table (case-insensitive).
 * - If the input is already a 2-letter string, treats it as an ISO code directly.
 * - Returns `undefined` for invalid or unmappable codes.
 *
 * @example
 * iocToIso("GER")  // "de"
 * iocToIso("SUI")  // "ch"
 * iocToIso("US")   // "us"  (2-letter passthrough)
 * iocToIso("XYZ")  // undefined
 */
export function iocToIso(iocCode: string): string | undefined {
  if (!iocCode) return undefined;

  const upper = iocCode.trim().toUpperCase();

  // Try IOC → ISO lookup first
  const iso = IOC_TO_ISO[upper];
  if (iso) return iso;

  // If 2 letters, treat as ISO code directly
  if (upper.length === 2) {
    const lower = upper.toLowerCase();
    // Accept any 2-letter alphabetic code
    if (/^[a-z]{2}$/.test(lower)) {
      return lower;
    }
  }

  return undefined;
}

/**
 * Check whether a string is a valid-looking lowercase 2-letter ISO country code.
 *
 * This only validates the format (exactly 2 lowercase ASCII letters); it does NOT
 * check against an exhaustive list of assigned codes.
 */
export function isValidIsoCode(code: string): boolean {
  return typeof code === "string" && /^[a-z]{2}$/.test(code);
}
