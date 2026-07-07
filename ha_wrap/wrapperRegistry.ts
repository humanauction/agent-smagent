import { BaseWrapper } from "./shared/baseWrapper";

import { ClaudeWrapper } from "./claude/claudeWrapper";
import { AiderWrapper } from "./aider/aiderWrapper";
import { CursorWrapper } from "./cursor/cursorWrapper";
import { CopilotWrapper } from "./copilot/copilotWrapper";
import { OpencodeWrapper } from "./opencode/opencodeWrapper";

export type WrapperId = "claude" | "aider" | "cursor" | "copilot" | "opencode";

export const WRAPPERS: Record<WrapperId, BaseWrapper> = {
    claude: new ClaudeWrapper(),
    aider: new AiderWrapper(),
    cursor: new CursorWrapper(),
    copilot: new CopilotWrapper(),
    opencode: new OpencodeWrapper(),
};

export function getWrapper(id: WrapperId): BaseWrapper {
    return WRAPPERS[id];
}
