// Results rank: accuracy (0..40 pts), rescues (0..40), deaths (20 → 0). Thresholds in UI.results.rank.
// Phase E: a mission's POW total is the sum over its parts (each part's level-reported count when we saw one,
// else the per-part estimate from tuning).
import { UI } from '../config/tuning/ui';
import type { PartResult } from '../config/campaign';
import { runInfo } from './index';

export type Rank = 'S' | 'A' | 'B' | 'C';

export interface ResultsData {
    stage: number;
    score: number;
    rescued: number;
    kills: number;
    deaths: number;
    /** 0..1 */
    accuracy: number;
    timeMs: number;
    difficulty: 'arcade' | 'casual';
    /** Phase E: the parts of the mission (their ids pick the POW totals). */
    parts?: PartResult[];
}

export function powTotalFor(r: ResultsData): number {
    const parts = r.parts ?? [];
    if (parts.length > 0) {
        let total = 0;
        for (const p of parts) {
            const seen = runInfo.powTotals[p.id] ?? 0;
            total += seen > 0 ? seen : (UI.results.powTotalByPart[p.id] ?? 4);
        }
        return total;
    }
    // Single-stage path (no parts): the level's own POW count when it reported one, else the per-stage estimate.
    const reported = runInfo.stage === r.stage ? runInfo.powTotal : 0;
    return reported > 0 ? reported : (UI.results.powTotal[r.stage] ?? 5);
}

export function rankPoints(r: ResultsData): number {
    const powTotal = powTotalFor(r);
    const acc = Math.max(0, Math.min(1, r.accuracy)) * 40;
    const pow = Math.min(1, r.rescued / Math.max(1, powTotal)) * 40;
    const life = Math.max(0, 20 - r.deaths * 7);
    return Math.round(acc + pow + life);
}

export function computeRank(r: ResultsData): Rank {
    const p = rankPoints(r);
    const T = UI.results.rank;
    if (p >= T.s) return 'S';
    if (p >= T.a) return 'A';
    if (p >= T.b) return 'B';
    return 'C';
}
