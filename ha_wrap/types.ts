// this file is used to define the types for the agent call parameters and results

export interface AgentCallParams {
    messages: { role: string; content: string }[];
    model: string;
    provider: string;
    session: string;
    options?: Record<string, any>;
}

export interface AgentResult {
    role: string;
    content: string;
}
