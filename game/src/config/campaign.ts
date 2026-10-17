// 🔒 Shared contract (owned by Engine). Campaign data: missions and their 3 parts (docs/CAMPAIGN.md).
// Other teams read it (ctx.part, PartClear, Title PART SELECT); propose changes in your report.

export type PartId = `${number}-${number}`;

export interface PartDef {
    id: PartId;
    /** 1-based mission number. */
    mission: number;
    /** 1-based part number inside the mission. */
    part: number;
    /** Title card name, e.g. 'THE CAMP'. */
    title: string;
    location: string;
    /** Tilemap cache key ('m1p1' ...). The level falls back to its default map when this key isn't loaded. */
    map: string;
    /** Default music key (a map `music` property or trigger can override). Missing keys are silent. */
    music: string;
    /** 1–3 radio lines from Hazel for the title card. */
    briefing: string[];
    /** Last part of its mission: mission Results instead of PART CLEAR. */
    final: boolean;
}

export interface MissionDef { id: number; name: string; biome: string; parts: PartDef[] }

export const CAMPAIGN: MissionDef[] = [
    {
        id: 1,
        name: 'PINE RIDGE BREAKOUT',
        biome: 'snow',
        parts: [
            {
                id: '1-1', mission: 1, part: 1, title: 'THE CAMP', location: 'Pine Ridge Prison Camp',
                map: 'm1p1', music: 'music_stage1', final: false,
                briefing: ["Knotz, you're out of the cell. Get past the camp. There's a logging train leaving the valley tonight."]
            },
            {
                id: '1-2', mission: 1, part: 2, title: 'TIMBER EXPRESS', location: 'Pine Ridge Logging Line',
                map: 'm1p2', music: 'music_m1p2', final: false,
                briefing: ['You made the train! The Regime armored the locomotive. Stop it before the trestle.']
            },
            {
                id: '1-3', mission: 1, part: 3, title: 'MOOSE LAKE', location: 'Project ANTLER, Moose Lake',
                map: 'm1p3', music: 'music_m1p3', final: true,
                briefing: ["Von Antler's lab is across the lake. Whatever he's got in there, end it, then we're gone."]
            }
        ]
    }
];

/** The first part of the campaign ('1-1'). */
export const FIRST_PART: PartDef = CAMPAIGN[0].parts[0];

export function partById(id: string | null | undefined): PartDef | undefined {
    if (!id) return undefined;
    for (const m of CAMPAIGN) for (const p of m.parts) if (p.id === id) return p;
    return undefined;
}

/** Next part of the same mission, else null. */
export function nextPart(id: PartId): PartDef | null {
    for (const m of CAMPAIGN) {
        const i = m.parts.findIndex(p => p.id === id);
        if (i >= 0) return m.parts[i + 1] ?? null;
    }
    return null;
}

export function missionOf(id: PartId): MissionDef | undefined {
    return CAMPAIGN.find(m => m.parts.some(p => p.id === id));
}

/** Results of one cleared part (PartClear tally, mission Results). */
export interface PartResult {
    id: PartId;
    score: number;
    rescued: number;
    kills: number;
    deaths: number;
    shots: number;
    hits: number;
    timeMs: number;
}

/** Run state carried from one part to the next: `scene.start('Game', { part, carry })`. */
export interface CarryState {
    score: number;
    lives: number;
    bombs: number;
    weapon: string;
    /** Infinity (pistol) survives as Infinity in memory; -1 is also read as Infinity (JSON-safe). */
    ammo: number;
    rescued: number;
    difficulty: 'arcade' | 'casual';
    /** Results of the parts cleared so far this run. */
    parts: PartResult[];
}

/** Scene data for `PartClear`. */
export interface PartClearData { from: PartDef; next: PartDef; result: PartResult; carry: CarryState }

/** Scene data for `Game`. */
export interface GameStartData { part?: PartId; carry?: CarryState }
