import { writeMarkdown } from "../../ha_docs/generator";

export async function generateDocs() {
    writeMarkdown("SMAGE_DOCS.md");
}
