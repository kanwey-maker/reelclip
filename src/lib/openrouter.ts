/**
 * OpenRouter integration for AI text generation (hooks, titles, caption enhancement)
 * OpenRouter provides access to GPT-4, Claude, Llama, and many other models through a single API
 */

export async function generateWithOpenRouter(
  prompt: string,
  apiKey: string,
  model: string = "openai/gpt-4o-mini"
): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "ReelForge",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You are a viral short-form video expert. You create hooks, titles, and captions that stop the scroll and drive engagement. Be concise, punchy, and optimized for TikTok/Reels/Shorts.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${error.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function generateHooks(
  transcript: string,
  category: string,
  apiKey: string
): Promise<string[]> {
  const prompt = `Generate 5 viral hook variations for a ${category} short-form video.

Transcript context: "${transcript.slice(0, 300)}..."

Requirements:
- Each hook must be under 15 words
- Open with a pattern interrupt (contrarian claim, shocking stat, or question)
- Create curiosity gap that forces viewers to watch
- Optimized for TikTok/Reels/Shorts algorithm
- Return ONLY the 5 hooks, one per line, no numbering or extra text

Example format:
The algorithm is not luck. It's a mirror.
We deleted our intro and retention tripled.
Nobody tells you the first 100 days are a test.
Your hook is a promise — keep it.
Shorts are not ads. They are the product.`;

  const result = await generateWithOpenRouter(prompt, apiKey);
  return result
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.length < 100)
    .slice(0, 5);
}

export async function generateTitles(
  hook: string,
  category: string,
  apiKey: string
): Promise<string[]> {
  const prompt = `Generate 5 viral title variations for a ${category} short-form video.

Hook: "${hook}"

Requirements:
- Each title must be under 10 words
- Use power words (secret, truth, exposed, revealed, etc.)
- Create urgency or FOMO
- Optimized for discovery and shares
- Return ONLY the 5 titles, one per line, no numbering or extra text

Example format:
The 100-day test nobody warns creators about
Delete your intro. Watch retention triple.
Shorts ARE the product now
Your hook is a promise — keep it
The algorithm is not luck. It's a mirror.`;

  const result = await generateWithOpenRouter(prompt, apiKey);
  return result
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.length < 80)
    .slice(0, 5);
}

export async function enhanceCaption(
  caption: string,
  apiKey: string
): Promise<string> {
  const prompt = `Enhance this caption for maximum viral impact. Keep it under 150 characters. Make it punchier, add urgency, and optimize for engagement.

Original: "${caption}"

Return ONLY the enhanced caption, no explanation or extra text.`;

  return await generateWithOpenRouter(prompt, apiKey);
}
