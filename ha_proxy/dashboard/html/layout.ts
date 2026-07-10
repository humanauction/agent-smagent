export function layout(title: string, body: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${title}</title>
<style>
    body {
        font-family: Inter, sans-serif;
        margin: 2rem;
        background: #222;
        color: #f8f9fa;
    }
    h1 {
        font-size: 1.8rem;
        margin-bottom: 1rem;
    }
    pre {
        background: #333;
        padding: 1rem;
        border-radius: 8px;
        border: 0px solid #ddd;
        overflow-x: auto;
    }
    .section {
        margin-bottom: 2rem;
    }
    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        padding: 0.4rem 0;
    }
    .section-title {
        font-weight: 600;
    }
    .section-toggle {
        font-size: 0.8rem;
        color: #666;
    }
    .tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
        border-bottom: 1px solid #ddd;
    }
    .tab {
        padding: 0.4rem 0.8rem;
        cursor: pointer;
        border-radius: 6px 6px 0 0;
        background: #e9ecef;
        font-size: 0.85rem;
    }
    .tab.active {
        background: #fff;
        border: 1px solid #ddd;
        border-bottom-color: #fff;
    }
    .tab-content {
        display: none;
    }
    .tab-content.active {
        display: block;
    }
</style>
<script>
    document.addEventListener("DOMContentLoaded", () => {
        // Collapsible sections
        document.querySelectorAll(".section-header").forEach((header) => {
            header.addEventListener("click", () => {
                const section = header.parentElement;
                const content = section.querySelector(".section-body");
                const toggle = header.querySelector(".section-toggle");
                const isHidden = content.style.display === "none";
                content.style.display = isHidden ? "block" : "none";
                toggle.textContent = isHidden ? "Hide" : "Show";
            });
        });

        // Tabs
        document.querySelectorAll(".tabs").forEach((tabsEl) => {
            const tabs = tabsEl.querySelectorAll(".tab");
            const contents = document.querySelectorAll(".tab-content");
            tabs.forEach((tab) => {
                tab.addEventListener("click", () => {
                    const target = tab.getAttribute("data-target");
                    tabs.forEach(t => t.classList.remove("active"));
                    contents.forEach(c => c.classList.remove("active"));
                    tab.classList.add("active");
                    const contentEl = document.querySelector("#" + target);
                    if (contentEl) contentEl.classList.add("active");
                });
            });
        });
    });
</script>
</head>
<body>
    <h1>${title}</h1>
    ${body}
</body>
</html>
`;
}
