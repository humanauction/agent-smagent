import type { SMAGEMessage } from "../../../ha_core";

export const userMsg = (content: string): SMAGEMessage => ({
    role: "user",
    content,
});

// this function is used to escape HTML special characters in a string to prevent XSS attacks when rendering user-generated dashboard content.
// Replaces &, <, and > with their corresponding HTML entities.
export function escapeHTML(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
