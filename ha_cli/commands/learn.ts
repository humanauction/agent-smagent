import { runLearningCycle } from "../../ha_learn/engine";

//this function runs the learning cycle for a given session, prints resulting update to console.log()
export async function runLearn(session: string) {
    const update = await runLearningCycle(session);
    console.log(JSON.stringify(update, null, 2));
}
