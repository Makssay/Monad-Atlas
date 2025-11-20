// ai.js — интеграция WebLLM

let aiEngine = null;
let aiReady = false;

(async () => {
  const config = {
    model_url: "https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1/resolve/main/",
    wasm_url: "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm/dist/wasm/",
    cache_size: 1
  };

  aiEngine = await webllm.createEngine(config);
  aiReady = true;

  console.log("%cWebLLM loaded!", "color: #3eeaff; font-weight: bold;");
})();

async function askAI(query, dapps) {
  if (!aiReady) {
    return { error: "AI is still loading, wait 5–10 seconds" };
  }

  const systemPrompt = `
Ты — AI ассистент Monad Atlas. 
Вот список dApps:
${JSON.stringify(dapps).slice(0, 15000)}

Ответ должен быть ТОЛЬКО JSON:
{
  "category":"...",
  "recommended":["dApp1","dApp2"]
}
`;

  const prompt = `Запрос пользователя: "${query}"`;

  const response = await aiEngine.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ]
  });

  let content = response.choices[0].message.content;

  try {
    return JSON.parse(content);
  } catch {
    return { error: "AI JSON parse error", raw: content };
  }
}
