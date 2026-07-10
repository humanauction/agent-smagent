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
</style>
</head>
<body>
    <h1>${title}</h1>
    ${body}
</body>
</html>
`;
}
