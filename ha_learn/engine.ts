import { collectSamples, mineSignals } from "./miner";
import type { LearningUpdate } from "./types";

// this file contains the main function that runs the learning cycle for a given session

// this function is the orchestrator called from CLI or agents to run the learning cycle for a given session
export async function runLearningCycle(
    session: string,
): Promise<LearningUpdate> {
    const samples = collectSamples(session);
    const update = mineSignals(samples);

    // TODO: persist update to disk (JSON file) or DB
    // e.g. writeFile(`learn/${session}.json`, JSON.stringify(update, null, 2))

    return update;
}
