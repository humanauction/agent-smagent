export function printSection(title: string) {
    console.log(`\n=== ${title} ===\n`);
}

export function printJSON(obj: any) {
    try {
        console.log(JSON.stringify(obj, null, 2));
    } catch (err) {
        console.log("<< JSON stringify failed >>");
        console.log(String(err));
    }
}
