import { runLearningCycle } from './../ha_learn/engine.js';
// this file contains a test script that runs the learning cycle for a given session and prints the resulting update to the console

// this function runs the learning cycle for a given session and prints the resulting update to the console
async function main() {
    const session = "abc123";
    const update = await runLearningCycle(session);
    console.log(JSON.stringify(update, null, 2));
}
// if you dont know what this does, you probably shouldnt be here
main();
