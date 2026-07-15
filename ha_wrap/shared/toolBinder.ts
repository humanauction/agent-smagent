import type { SMAGEMessage } from '../../ha_core/index.js';

export function bindTools(
    toolSchemaText: string,
    wrapperId: string,
): SMAGEMessage[] {
    if (!toolSchemaText.trim()) return [];

    return [
        {
            role: "system",
            content: toolSchemaText,
            meta: {
                anchor: true,
                wrapper: wrapperId,
                toolSchema: true,
            },
        },
    ];
}
