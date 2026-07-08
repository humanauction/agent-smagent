export function parseArgs(argv: string[]) {
    const [, , command, wrapper, ...rest] = argv;
    const prompt = rest.join(" ").trim();

    return { command, wrapper, prompt };
}
