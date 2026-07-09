import { loadWrapperMemory } from "../../ha_wrap/shared/memoryLoader";
import { printSection, printJSON } from "../utils/printer";

import type { WrapperId } from "../../ha_wrap/wrapperRegistry";
import type { SMAGEMessage } from "../../ha_core/index";

import { scoreMemory } from "../../ha_learn/memoryScore";
import { decayMemory } from "../../ha_learn/memoryDecay";
import { weightMemory } from "../../ha_learn/memoryWeight";
import { pruneMemory } from "../../ha_learn/memoryPrune";
import { resolveConflicts } from "../../ha_learn/memoryResolve";

export async function memoryCommand(wrapperId: string) {
    const raw = loadWrapperMemory(wrapperId as WrapperId);

    printSection("Raw Memory");
    printJSON(raw);

    // score, weight decay
    const scored = raw.map((m) => {
        const meta = m.meta ?? {};
        const score = scoreMemory({
            failureType: meta.failureType,
            frequency: meta.frequency ?? 1,
            recencyMs: Date.now() - (meta.timestamp ?? Date.now()),
            wrapperId: meta.wrapper,
        });

        const weight = decayMemory(
            weightMemory(score),
            Date.now() - (meta.timestamp ?? Date.now()),
        );

        return {
            ...m,
            meta: {
                ...meta,
                score,
                weight,
            },
        };
    });

    printSection("Scored / Weighted / Decayed");
    printJSON(scored);

    // prune
    const pruned = pruneMemory(scored);

    printSection("Pruned Memory (>0.2 weight)");
    printJSON(pruned);

    // resolve conflicts
    const resolved = resolveConflicts(pruned);

    printSection("Conflict-Resolved Memory");
    printJSON(resolved);

    // sort by weight
    const sorted = [...resolved].sort(
        (a, b) => (b.meta?.weight ?? 0) - (a.meta?.weight ?? 0),
    );

    printSection("Sorted by Weight");
    printJSON(sorted);
}
