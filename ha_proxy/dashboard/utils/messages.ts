import type { SMAGEMessage } from "../../../ha_core";

export const userMsg = (content: string): SMAGEMessage => ({
    role: "user",
    content,
});
