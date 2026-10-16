// Results rank: accuracy (0..40 pts), rescues (0..40), deaths (20 → 0). Thresholds in UI.results.rank.
import { UI } from '../config/tuning/ui';

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
}

export function rankPoints(r: ResultsData): number {
    const powTotal = UI.results.powTotal[r.stage] ?? 5;
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
