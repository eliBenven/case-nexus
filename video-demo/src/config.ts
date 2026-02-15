// ============================================================
//  DEMO VIDEO CONFIG — Matches real Case Nexus app exactly
// ============================================================

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Colors — exact match from main.css :root
export const COLORS = {
  // Backgrounds
  bg: '#07080c',
  bgSecondary: '#0c0e15',
  bgTertiary: '#111420',
  bgCard: '#161926',
  bgHover: '#1c1f30',
  bgGlass: 'rgba(17, 20, 32, 0.85)',
  surfaceAlt: 'rgba(255, 255, 255, 0.03)',
  surfaceRaised: '#1a1d2e',

  // Borders
  border: 'rgba(255, 255, 255, 0.06)',
  borderLight: 'rgba(255, 255, 255, 0.11)',
  borderAccent: 'rgba(201, 168, 76, 0.22)',

  // Text
  text: '#f0f1f7',
  textSecondary: '#9295ad',
  textMuted: '#585a72',

  // Gold
  gold: '#d4af37',
  goldDim: '#9a7e2e',
  goldBright: '#e8c547',
  goldGlow: 'rgba(212, 175, 55, 0.10)',
  goldGlowStrong: 'rgba(212, 175, 55, 0.24)',

  // Status
  red: '#e5484d',
  redBg: 'rgba(229, 72, 77, 0.09)',
  green: '#30a46c',
  greenBg: 'rgba(48, 164, 108, 0.09)',
  blue: '#3e63dd',
  blueBg: 'rgba(62, 99, 221, 0.09)',
  orange: '#e5a000',
  orangeBg: 'rgba(229, 160, 0, 0.09)',
  purple: '#8e4ec6',
  purpleBg: 'rgba(142, 78, 198, 0.09)',
};

// Layout — exact match
export const LAYOUT = {
  sidebarWidth: 300,
  headerHeight: 56,
  radius: 8,
  radiusSm: 5,
  radiusLg: 12,
};

// Fonts
export const FONTS = {
  sans: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'IBM Plex Mono', 'Fira Code', monospace",
};

// ============================================================
//  SCENES
// ============================================================

export interface SceneConfig {
  id: string;
  title: string;
  durationSec: number;
  narration: string;
}

export const FADE_OUT_SEC = 0.8;

export const SCENES: SceneConfig[] = [
  {
    id: 'title',
    title: 'Title Card',
    durationSec: 2,
    narration: '',
  },
  {
    id: 'problem',
    title: 'The Problem',
    durationSec: 22,
    narration:
      "Public defenders in Georgia carry five hundred active cases. They walk into court with minutes to prepare. A pattern of unconstitutional stops by the same officer across four cases goes unnoticed — because no human can hold five hundred case files in their head at once. Case Nexus changes that.",
  },
  {
    id: 'sync',
    title: 'Caseload Sync',
    durationSec: 15,
    narration:
      "We sync five hundred cases from the court system. Felonies, misdemeanors, everything a public defender carries — charges, hearing dates, plea offers, witness lists, and prior records.",
  },
  {
    id: 'healthcheck',
    title: 'Health Check — 1M Context',
    durationSec: 37,
    narration:
      "Now the hero feature. We load all five hundred cases — over two hundred seventy-five thousand tokens — into a single prompt. No RAG. No chunking. The AI sees every case simultaneously. Claude uses sixty thousand tokens of extended thinking to scan the entire caseload. It discovers that Officer Rodriguez appears in four separate traffic stop cases, all with contested vehicle searches. A Fourth Amendment pattern no attorney could spot manually.",
  },
  {
    id: 'cascade',
    title: 'Cascade Intelligence',
    durationSec: 31,
    narration:
      "Cascade Intelligence turns Claude into an autonomous investigator with nine tools. It pulls cases, looks up Georgia statutes, searches real case law, and finds cross-case patterns — all on its own. Watch as Claude investigates a case, looks up the relevant statute, then searches for precedent. When it finishes, you get a strategic brief and smart actions you can execute with one click.",
  },
  {
    id: 'adversarial',
    title: 'Adversarial Simulation',
    durationSec: 31,
    narration:
      "The adversarial simulation chains three separate Claude sessions. A prosecution AI builds the strongest possible case. A defense AI reads the prosecution's arguments and dismantles them. A judicial analyst synthesizes both sides. Each phase uses its own thinking budget — over eighty thousand tokens of chained reasoning. Three adversarial perspectives, each with full visible reasoning.",
  },
  {
    id: 'closing',
    title: 'Closing — Capabilities',
    durationSec: 17,
    narration:
      "Case Nexus uses every major Opus capability. The million-token context window. Extended thinking with streaming. Autonomous tool use. Long-form output generation. And multi-phase reasoning chains.",
  },
  {
    id: 'builtwith',
    title: 'Built With Claude Code',
    durationSec: 19,
    narration:
      "One more thing. This entire video demo was built with Claude Code — same model powering Case Nexus. Every scene, every animation, even the title card. Over twenty thousand lines of code. One model. Zero manual editing.",
  },
  {
    id: 'finale',
    title: 'Finale — Mission',
    durationSec: 6,
    narration:
      "All in service of one goal... making sure no public defender's client falls through the cracks.",
  },
];

// Compute frame ranges
export function getSceneFrames() {
  let currentFrame = 0;
  return SCENES.map((scene) => {
    const startFrame = currentFrame;
    const durationFrames = scene.durationSec * FPS;
    currentFrame += durationFrames;
    return { ...scene, startFrame, durationFrames };
  });
}

export const TOTAL_DURATION_FRAMES = SCENES.reduce(
  (sum, s) => sum + s.durationSec * FPS,
  0,
);

// ============================================================
//  MOCK DATA — for the sidebar case list
// ============================================================

export interface MockCase {
  id: string;
  name: string;
  charge: string;
  severity: 'felony' | 'misdemeanor';
  status: string;
  date: string;
}

// First 20 cases that appear in the sidebar (realistic Georgia names)
export const MOCK_CASES: MockCase[] = [
  { id: 'CR-2025-0360', name: 'Eric Jackson', charge: 'Possession of Controlled Substance', severity: 'misdemeanor', status: 'ACTIVE', date: '2026-02-13' },
  { id: 'CR-2025-0358', name: 'Thomas Williams', charge: 'Entering Automobile', severity: 'felony', status: 'ACTIVE', date: '2026-02-11' },
  { id: 'CR-2025-0302', name: 'Richard Turner', charge: 'Vandalism', severity: 'misdemeanor', status: 'ACTIVE', date: '2026-02-11' },
  { id: 'CR-2025-0067', name: 'William Reed', charge: 'Petit Larceny', severity: 'misdemeanor', status: 'ACTIVE', date: '2026-02-11' },
  { id: 'CR-2025-0098', name: 'Eric Edwards', charge: 'Petit Larceny', severity: 'misdemeanor', status: 'ACTIVE', date: '2026-02-11' },
  { id: 'CR-2025-0133', name: 'Stephanie Thompson', charge: 'Possession of Controlled Substance', severity: 'misdemeanor', status: 'ACTIVE', date: '2026-02-21' },
  { id: 'CR-2025-0046', name: 'Tamika Thompson', charge: 'Weapons Possession (Convicted Felon)', severity: 'felony', status: 'ACTIVE', date: '2026-02-11' },
  { id: 'CR-2025-0012', name: 'Marcus Webb', charge: 'Traffic Stop — DUI', severity: 'misdemeanor', status: 'ACTIVE', date: '2026-02-14' },
  { id: 'CR-2025-0089', name: 'Darnell Washington', charge: 'Possession with Intent', severity: 'felony', status: 'ACTIVE', date: '2026-03-01' },
  { id: 'CR-2025-0278', name: 'Jerome Jones', charge: 'Theft by Taking (Felony)', severity: 'felony', status: 'ACTIVE', date: '2026-02-11' },
  { id: 'CR-2025-0166', name: 'Eric Johnson', charge: 'Driving on Suspended License', severity: 'misdemeanor', status: 'ACTIVE', date: '2026-02-11' },
  { id: 'CR-2025-0044', name: 'Tiffany Hall', charge: 'Simple Battery', severity: 'misdemeanor', status: 'ACTIVE', date: '2026-02-11' },
  { id: 'CR-2025-0071', name: 'Terrence Lee', charge: 'DUI - Under the Influence', severity: 'misdemeanor', status: 'PLEA PENDING', date: '2026-02-13' },
  { id: 'CR-2025-0018', name: 'Mary Santos', charge: 'Simple Battery', severity: 'misdemeanor', status: 'ACTIVE', date: '2026-02-12' },
  { id: 'CR-2025-0088', name: 'Andre Martin', charge: 'Loitering', severity: 'misdemeanor', status: 'ACTIVE', date: '2026-02-13' },
  { id: 'CR-2025-0079', name: 'Omar Stewart', charge: 'Burglary - Second Degree', severity: 'felony', status: 'ACTIVE', date: '2026-02-12' },
  { id: 'CR-2025-0118', name: 'Jamal Henderson', charge: 'Traffic Stop — Speeding', severity: 'misdemeanor', status: 'ACTIVE', date: '2026-02-15' },
  { id: 'CR-2025-0134', name: 'DeShawn Mitchell', charge: 'Traffic Stop — Failure to Signal', severity: 'misdemeanor', status: 'ACTIVE', date: '2026-02-18' },
  { id: 'CR-2025-0203', name: 'Angela Davis', charge: 'Aggravated Assault', severity: 'felony', status: 'ACTIVE', date: '2026-02-20' },
  { id: 'CR-2025-0291', name: 'Robert Williams', charge: 'Aggravated Assault', severity: 'felony', status: 'PLEA PENDING', date: '2026-02-22' },
];
