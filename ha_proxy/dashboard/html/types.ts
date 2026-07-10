import type { SMAGEMessage } from "../../../ha_core";

export interface MemoryView {
    raw: SMAGEMessage[];
    scored: SMAGEMessage[];
    pruned: SMAGEMessage[];
    resolved: SMAGEMessage[];
    sorted: SMAGEMessage[];
}

export interface HealthView {
    wrapper: string;
    memoryCount: number;
    memoryStatus: string;
}
