export function printSection(title: string) {
    console.log(`\n=== ${title} ===\n`);
}

export function printJSON(obj: any) {
    console.log(JSON.stringify(obj, null, 2));
}
