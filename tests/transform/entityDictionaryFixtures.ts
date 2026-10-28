// this file contains fixtures for testing the entity dictionary transformation functions
export interface EntityDictionaryFixture {
    id: string;
    category: "entity-heavy" | "ordinary" | "edge";
    content: string;
    expectedToFactor: boolean;
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
];
