import fs from "fs";
import path from "path";
import { generateDocs } from "./generator.js";
import type { DocModule } from "./types.js";

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function renderNav(modules: DocModule[]): string {
    return `
<ul class="nav">
${modules
    .map((m) => {
        const id = m.path.replace(/[^\w-]/g, "_");
        return `<li><a href="#${id}">${m.path}</a></li>`;
    })
    .join("\n")}
</ul>`;
}

function renderContent(modules: DocModule[]): string {
    return modules
        .map((mod) => {
            const id = mod.path.replace(/[^\w-]/g, "_");
            const symbols = mod.symbols
                .map((sym) => {
                    return `
<h3>${sym.kind} <code>${sym.name}</code></h3>
${sym.signature ? `<pre><code>${escapeHtml(sym.signature)}</code></pre>` : ""}
${sym.jsdoc ? `<pre class="jsdoc">${escapeHtml(sym.jsdoc)}</pre>` : ""}
`;
                })
                .join("\n");

            return `
<section id="${id}">
  <h2>${mod.path}</h2>
  ${symbols}
</section>`;
        })
        .join("\n");
}

export function writeHtmlDocsite(outputFile = "SMAGE_DOCS.html") {
    const modules = generateDocs();

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>SMAGE Documentation</title>
  <style>
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      display: flex;
      height: 100vh;
    }
    .sidebar {
      width: 260px;
      background: #0b1b12;
      color: #c8f5dd;
      padding: 16px;
      overflow-y: auto;
    }
    .content {
      flex: 1;
      padding: 24px;
      background: #050908;
      color: #e5f7ee;
      overflow-y: auto;
    }
    .nav {
      list-style: none;
      padding: 0;
    }
    .nav a {
      color: #9be7c4;
      text-decoration: none;
      font-size: 13px;
    }
    pre {
      background: #0f1f16;
      padding: 8px 12px;
      border-radius: 4px;
      overflow-x: auto;
    }
    code {
      font-family: Menlo, Monaco, "SF Mono", monospace;
    }
  </style>
</head>
<body>
  <aside class="sidebar">
    <h1>SMAGE Modules</h1>
    ${renderNav(modules)}
  </aside>
  <main class="content">
    <h1>SMAGE Documentation</h1>
    ${renderContent(modules)}
  </main>
</body>
</html>`;

    fs.writeFileSync(outputFile, html, "utf8");
    console.log(`Wrote HTML docsite to ${outputFile}`);
}
