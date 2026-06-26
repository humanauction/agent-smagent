export function compressContent(text: string): string {
    return "[compressed] " + text.split(/\s+/).slice(0, 80).join(" ") + " ...";
}
