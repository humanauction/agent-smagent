// this file contains the types that are used by the MCP server, which are used to compress, retrieve, and analyze messages

// this interface represents a single learning sample (set of messages) used to train the model
export interface LearningSample {
    session: string;
    stage: string;
    messages: { role: string; content: string }[];
    timestamp?: number;
    provider?: string;
    model?: string;
    error?: string;
    outcome: "success" | "error" | "observation";
    metrics?: {
        inputTokens?: number;
        outputTokens?: number;
        retentionRate?: number;
    };
}

// this interface represents a set of learning samples that are used to train the model
export interface LearningSignal {
    type: "anchor" | "priority" | "memory" | "reduction";
    description: string;
    data: unknown;
    source: {
        session: string;
        stage: string;
        timestamp?: number;
    };
    outcome: LearningSample["outcome"];
}

// this interface represents a set of learning updates that are used to train the model
export interface LearningUpdate {
    anchors?: LearningSignal[];
    priorities?: LearningSignal[];
    memories?: LearningSignal[];
    reducers?: LearningSignal[];
}
