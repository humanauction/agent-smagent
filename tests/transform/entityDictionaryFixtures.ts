// this file contains fixtures for testing the entity dictionary transformation functions
export interface EntityDictionaryFixture {
    id: string;
    category: "entity-heavy" | "project-heavy" | "ordinary" | "edge";
    content: string;
    expectedToFactor: boolean;
    requiredPhrases?: string[];
}

const repeated = (sentence: (index: number) => string, count = 7) =>
    Array.from({ length: count }, (_, index) => sentence(index)).join(" ");

export const entityDictionaryFixtures: EntityDictionaryFixture[] = [
    {
        id: "repeated-project-name",
        category: "entity-heavy",
        content: repeated(
            (index) =>
                `Aster National International Research Partnership Group ${["approved", "assigned", "reviewed"][index % 3]} the proposal for project ${index}.`,
        ),
        expectedToFactor: true,
    },
    {
        id: "multiple-repeated-organizations",
        category: "entity-heavy",
        content: repeated(
            (index) =>
                index % 2 === 0
                    ? `North Harbor International Community Research Trust briefed Cedar Advanced Computational Analytics Laboratory about project ${index}.`
                    : `Cedar Advanced Computational Analytics Laboratory briefed North Harbor International Community Research Trust about project ${index}.`,
            10,
        ),
        expectedToFactor: true,
    },
    {
        id: "unicode-entity-name",
        category: "entity-heavy",
        content: repeated(
            (index) =>
                `Équipe Internationale Européenne Lumière Brillante ${index % 2 ? "approved" : "reviewed"} the plan for secteur ${index}.`,
            16,
        ),
        expectedToFactor: true,
    },
    {
        id: "ordinary-prose-short-repetitions",
        category: "ordinary",
        content:
            "The river runs through the valley. The river rises after rain. The valley stays green.",
        expectedToFactor: false,
    },
    {
        id: "one-off-proper-name",
        category: "ordinary",
        content:
            "Aster Research Group approved the proposal, while Cedar Analytics Lab reviewed it.",
        expectedToFactor: false,
    },
    {
        id: "literal-handle-collision",
        category: "edge",
        content: repeated(
            (index) =>
                `Aster National International Research Partnership Group approved work ${index}; the literal SMAGE_ENTITY_0_REF remains code.`,
            7,
        ),
        expectedToFactor: true,
    },
    {
        id: "punctuation-and-quotes",
        category: "edge",
        content: repeated(
            (index) =>
                `Aster National International Research Partnership Group said, "Proceed: phase ${index}."`,
        ),
        expectedToFactor: true,
    },
    {
        id: "repeated-project-identifiers",
        category: "project-heavy",
        content: repeated((index) => `SMAGE Deterministic Freeze Baseline retains the reviewed result for case ${index}.`, 16),
        expectedToFactor: true,
        requiredPhrases: ["SMAGE Deterministic Freeze Baseline", "reviewed result"],
    },
    {
        id: "multiple-projects-with-similar-prefixes",
        category: "project-heavy",
        content: repeated((index) => index % 2 === 0
            ? `SMAGE Schema Factoring Evaluation passed fixture ${index}.`
            : `SMAGE Schema Factoring Pipeline preserved fixture ${index}.`, 12),
        expectedToFactor: true,
        requiredPhrases: ["SMAGE Schema Factoring Evaluation", "SMAGE Schema Factoring Pipeline"],
    },
    {
        id: "project-name-with-phase-and-version",
        category: "project-heavy",
        content: repeated((index) => `CCR Baseline Sequence phase 2 version v2.4 remains active in review ${index}.`, 16),
        expectedToFactor: true,
        requiredPhrases: ["CCR Baseline Sequence", "phase 2", "v2.4"],
    },
    {
        id: "project-status-across-decisions",
        category: "project-heavy",
        content: repeated((index) => [
            `Agent Smagent Entity Dictionary is proposed in decision ${index}.`,
            `Agent Smagent Entity Dictionary remains opt-in after review ${index}.`,
            `Agent Smagent Entity Dictionary advances after fixture run ${index}.`,
        ][index % 3] ?? `Agent Smagent Entity Dictionary status ${index}.`, 18),
        expectedToFactor: true,
        requiredPhrases: ["Agent Smagent Entity Dictionary", "remains opt-in"],
    },
    {
        id: "project-name-in-quoted-requirement",
        category: "project-heavy",
        content: repeated((index) => `Requirement ${index}: "Agent Smagent Reversible Compression" must restore every source value exactly.`, 16),
        expectedToFactor: true,
        requiredPhrases: ["Agent Smagent Reversible Compression", "restore every source value exactly"],
    },
    {
        id: "one-off-project-reference",
        category: "ordinary",
        content: "SMAGE Deterministic Freeze Baseline was reviewed once. The remaining notes discuss ordinary pipeline behavior.",
        expectedToFactor: false,
        requiredPhrases: ["SMAGE Deterministic Freeze Baseline"],
    },
    {
        id: "similar-project-names-must-not-merge",
        category: "project-heavy",
        content: repeated((index) => index % 2 === 0
            ? `Agent Smagent Freeze Gate approves case ${index}; Agent Smagent Freeze Review records evidence ${index}.`
            : `Agent Smagent Freeze Review records evidence ${index}; Agent Smagent Freeze Gate approves case ${index}.`, 16),
        expectedToFactor: true,
        requiredPhrases: ["Agent Smagent Freeze Gate", "Agent Smagent Freeze Review"],
    },
    {
        id: "literal-project-handle-collision",
        category: "edge",
        content: repeated((index) => `SMAGE Deterministic Freeze Baseline notes SMAGE_ENTITY_0_REF as a literal identifier in record ${index}.`, 16),
        expectedToFactor: true,
        requiredPhrases: ["SMAGE_ENTITY_0_REF", "SMAGE Deterministic Freeze Baseline"],
    },
    {
        id: "mixed-project-and-ordinary-prose",
        category: "project-heavy",
        content: repeated((index) => `Agent Smagent Schema Evaluation recorded result ${index}. The team then discussed meeting notes, lunch plans, and ordinary delivery details.`, 16),
        expectedToFactor: true,
        requiredPhrases: ["Agent Smagent Schema Evaluation", "meeting notes", "lunch plans"],
    },
];
