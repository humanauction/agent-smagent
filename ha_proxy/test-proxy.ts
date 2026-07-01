async function main() {
    const res = await fetch("http://localhost:8000/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            provider: "openai",
            model: "gpt-4o-mini",
            messages: [
                { role: "user", content: "hello" },
                { role: "assistant", content: "response" },
            ],
            options: { maxTokens: 200 },
        }),
    });

    const json = await res.json();
    console.log("proxy result:", json);
}

main();
