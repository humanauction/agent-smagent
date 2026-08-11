import type { ChainScoreEntry } from "./chainScoreUI.js";

export class ChainScoreDashboard {
    static cli(entries: ChainScoreEntry[]): string {
        const lines: string[] = [];

        lines.push("=== Provider Chain Scoring Dashboard ===");

        for (const e of entries) {
            lines.push(`\nProvider: ${e.provider}`);
            lines.push(`  Raw Metrics: ${JSON.stringify(e.metrics)}`);
            lines.push(`  Weighted: ${JSON.stringify(e.weighted)}`);
            lines.push(`  Raw Score: ${e.rawScore.toFixed(3)}`);
            lines.push(`  Memory Boost: ${e.memoryBoost.toFixed(3)}`);
            lines.push(`  Final Score: ${e.finalScore.toFixed(3)}`);
            lines.push(`  Cached: ${e.cached ? "yes" : "no"}`);
        }

        const sorted = [...entries].sort((a, b) => b.finalScore - a.finalScore);
        lines.push("\nFinal Chain Order:");
        lines.push(sorted.map((x) => x.provider).join(" → "));

        return lines.join("\n");
    }

    static html(entries: ChainScoreEntry[]): string {
        const rows = entries
            .map((e) => {
                return `
                    <tr>
                        <td>${e.provider}</td>
                        <td>${e.rawScore.toFixed(3)}</td>
                        <td>${e.memoryBoost.toFixed(3)}</td>
                        <td>${e.finalScore.toFixed(3)}</td>
                        <td>${e.cached ? "yes" : "no"}</td>
                        <td><pre>${JSON.stringify(e.metrics, null, 2)}</pre></td>
                        <td><pre>${JSON.stringify(e.weighted, null, 2)}</pre></td>
                    </tr>
                `;
            })
            .join("");

        const sorted = [...entries].sort((a, b) => b.finalScore - a.finalScore);
        const chainOrder = sorted.map((x) => x.provider).join(" → ");

        return `
            <html>
            <head>
                <style>
                    body { font-family: monospace; background: #111; color: #eee; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #444; padding: 8px; }
                    th { background: #222; }
                    tr:nth-child(even) { background: #1a1a1a; }
                    .chain-order { margin-top: 20px; font-size: 1.2em; }
                </style>
            </head>
            <body>
                <h1>Provider Chain Scoring Dashboard</h1>
                <div class="chain-order">Final Chain Order: ${chainOrder}</div>
                <table>
                    <tr>
                        <th>Provider</th>
                        <th>Raw Score</th>
                        <th>Memory Boost</th>
                        <th>Final Score</th>
                        <th>Cached</th>
                        <th>Raw Metrics</th>
                        <th>Weighted Metrics</th>
                    </tr>
                    ${rows}
                </table>
            </body>
            </html>
        `;
    }
}
