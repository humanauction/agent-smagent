import { writeMarkdown } from '../../ha_docs/generator.js';

export async function generateDocs() {
    writeMarkdown("SMAGE_DOCS.md");
}
