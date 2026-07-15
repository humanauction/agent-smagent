import { BaseWrapper } from './shared/baseWrapper.js';

import { ClaudeWrapper } from './claude/claudeWrapper.js';
import { AiderWrapper } from './aider/aiderWrapper.js';
import { CursorWrapper } from './cursor/cursorWrapper.js';
import { CopilotWrapper } from './copilot/copilotWrapper.js';
import { OpencodeWrapper } from './opencode/opencodeWrapper.js';

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
