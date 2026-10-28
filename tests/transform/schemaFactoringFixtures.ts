export interface SchemaFactoringFixture {
    id: string;
    category: "supported" | "unsupported";
    content: string;
    expectedSupport: boolean;
    requiredPhrases?: string[];
}

const records = (
    count: number,
    build: (index: number) => Record<string, unknown>,
) => JSON.stringify(Array.from({ length: count }, (_, index) => build(index)), null, 2);

const shortKeys = (count: number) =>
    records(count, (index) => ({
        record_identifier: `record-${index}`,
        assigned_department_name: `department-${index % 4}`,
        operational_status_value: index % 2 === 0 ? "active" : "pending",
    }));

const referenceMarker = `SMAGE_SCHEMA_${"0".repeat(24)}_REF`;

export const schemaFactoringFixtures: SchemaFactoringFixture[] = [
    {
        id: "minimum-three-rows",
        category: "supported",
        content: records(3, (index) => ({
            employee_identifier: `employee-${index}`,
            assigned_department: `department-${index % 2}`,
            account_status: "active",
            access_enabled: index % 2 === 0,
        })),
        expectedSupport: true,
    },
    {
        id: "large-64-row-records",
        category: "supported",
        content: records(64, (index) => ({
            transaction_identifier: `transaction-${10000 + index}`,
            customer_display_name: `Customer ${index}`,
            fulfillment_region: index % 3 === 0 ? "north-west" : "south-east",
            transaction_state: index % 2 === 0 ? "awaiting-dispatch" : "complete",
            delivery_instructions: `Leave parcel with reception desk ${index % 7}`,
            retry_count: index % 5,
            customer_confirmed: index % 2 === 0,
        })),
        expectedSupport: true,
        requiredPhrases: ["transaction-10000", "reception desk"],
    },
    {
        id: "one-field-records",
        category: "unsupported",
        content: records(8, (index) => ({
            transaction_identifier: `transaction-${index}`,
        })),
        expectedSupport: false,
    },
    {
        id: "many-fields",
        category: "supported",
        content: records(12, (index) => ({
            customer_identifier: `customer-${index}`,
            customer_display_name: `Customer name ${index}`,
            account_region: `region-${index % 3}`,
            account_status: "active",
            billing_currency: "GBP",
            payment_method_name: "bank transfer",
            support_tier_name: `tier-${index % 2}`,
            invoice_delivery_mode: "electronic-mail",
            retry_attempt_count: index % 4,
            notifications_enabled: index % 2 === 0,
            has_open_invoice: index % 3 === 0,
            nullable_external_reference: null,
        })),
        expectedSupport: true,
    },
    {
        id: "punctuation-braces-quotes-and-marker-text",
        category: "supported",
        content: records(10, (index) => ({
            event_identifier: `event-${index}`,
            detail_text: `value {"quoted": "item ${index}"}; marker ${referenceMarker}`,
            route_name: `zone/${index % 2} -> queue[${index % 3}]`,
        })),
        expectedSupport: true,
        requiredPhrases: ["quoted", "marker"],
    },
    {
        id: "unicode-and-empty-strings",
        category: "supported",
        content: records(10, (index) => ({
            message_identifier: `message-${index}`,
            display_label: index % 2 === 0 ? "Résumé 東京 🧭" : "Δοκιμή café",
            optional_note: "",
        })),
        expectedSupport: true,
    },
    {
        id: "null-negative-decimal-and-booleans",
        category: "supported",
        content: records(10, (index) => ({
            reading_identifier: `reading-${index}`,
            optional_label: null,
            temperature_celsius: index % 2 === 0 ? -18.75 : 21.5,
            feature_enabled: index % 2 === 0,
        })),
        expectedSupport: true,
    },
    {
        id: "mixed-scalar-types-by-field",
        category: "supported",
        content: records(10, (index) => ({
            account_identifier: `account-${index}`,
            score_value: index - 5,
            is_active: index % 2 === 0,
            optional_code: null,
        })),
        expectedSupport: true,
    },
    {
        id: "two-records",
        category: "unsupported",
        content: records(2, (index) => ({
            record_identifier: `record-${index}`,
            assigned_department_name: `department-${index}`,
        })),
        expectedSupport: false,
    },
    {
        id: "nested-objects",
        category: "unsupported",
        content: records(6, (index) => ({
            record_identifier: `record-${index}`,
            nested_details: { address: `street-${index}` },
        })),
        expectedSupport: false,
    },
    {
        id: "nested-arrays",
        category: "unsupported",
        content: records(6, (index) => ({
            record_identifier: `record-${index}`,
            tags: [`tag-${index}`, "shared"],
        })),
        expectedSupport: false,
    },
    {
        id: "inconsistent-field-order",
        category: "unsupported",
        content: JSON.stringify([
            { record_identifier: "one", status_value: "active", owner_name: "Ada" },
            { status_value: "active", record_identifier: "two", owner_name: "Bea" },
            { record_identifier: "three", status_value: "active", owner_name: "Cam" },
        ]),
        expectedSupport: false,
    },
    {
        id: "missing-and-extra-fields",
        category: "unsupported",
        content: JSON.stringify([
            { record_identifier: "one", status_value: "active" },
            { record_identifier: "two", status_value: "active", extra_value: true },
            { record_identifier: "three" },
        ]),
        expectedSupport: false,
    },
    {
        id: "mixed-values-within-one-field",
        category: "unsupported",
        content: JSON.stringify([
            { record_identifier: "one", status_value: "active" },
            { record_identifier: "two", status_value: 2 },
            { record_identifier: "three", status_value: "pending" },
        ]),
        expectedSupport: false,
    },
    {
        id: "negative-zero",
        category: "unsupported",
        content: '[{"record_identifier":"one","measurement_value":-0},{"record_identifier":"two","measurement_value":-0},{"record_identifier":"three","measurement_value":-0}]',
        expectedSupport: false,
    },
    {
        id: "non-json-infinity-and-nan",
        category: "unsupported",
        content: '[{"record_identifier":"one","measurement_value":Infinity},{"record_identifier":"two","measurement_value":NaN},{"record_identifier":"three","measurement_value":Infinity}]',
        expectedSupport: false,
    },
    {
        id: "root-object",
        category: "unsupported",
        content: JSON.stringify({ records: JSON.parse(shortKeys(5)) }),
        expectedSupport: false,
    },
    {
        id: "prose-with-json-fragment",
        category: "unsupported",
        content: 'The response body looked like {"status":"active"}, but is prose, not a root array.',
        expectedSupport: false,
    },
    {
        id: "array-with-non-object-values",
        category: "unsupported",
        content: JSON.stringify([
            { record_identifier: "one", status_value: "active" },
            null,
            { record_identifier: "three", status_value: "active" },
        ]),
        expectedSupport: false,
    },
    {
        id: "empty-array",
        category: "unsupported",
        content: "[]",
        expectedSupport: false,
    },
    {
        id: "malformed-json",
        category: "unsupported",
        content: '{"record_identifier": "broken"',
        expectedSupport: false,
    },
];

export const sameSessionSchemaFixtures = {
    first: records(16, (index) => ({
        customer_identifier: `customer-${index}`,
        assigned_department_name: `department-${index % 3}`,
        account_status_value: "active",
    })),
    second: records(16, (index) => ({
        project_identifier: `project-${index}`,
        project_display_name: `Project ${index}`,
        release_status_value: "planned",
        archived_flag: index % 2 === 0,
    })),
};
