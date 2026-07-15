import { collectSamples, mineSignals } from './miner.js';
import type { LearningUpdate } from './types.js';
import { reversibleLog } from '../ha_core/cache/log.js';

// this file contains the main function that runs the learning cycle for a given session

// this function is the orchestrator called from CLI or agents to run the learning cycle
export async function runLearningCycle(
    session: string,
): Promise<LearningUpdate> {
    const samples = collectSamples(session);
    const update = mineSignals(samples);

    // engine-level signal bundle
    const signal = {
        session,
        samples,
        update,
    };

    // TODO: persist update to disk (JSON file) or DB
    // e.g. writeFile(`learn/${session}.json`, JSON.stringify(update, null, 2))

    // unified reversibleLog for learning cycle
    reversibleLog(session, "learning_signal", signal);
    reversibleLog(session, "learning_update", update);

    return update;
}
