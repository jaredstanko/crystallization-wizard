// Cloudflare Pages Function — AI chat proxy
// Accepts messages array + system prompt, proxies to OpenRouter

const rateLimits = new Map();

function checkRateLimit(ip, limitPerHour) {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 3600000 });
    return true;
  }
  if (entry.count >= limitPerHour) return false;
  entry.count++;
  return true;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Rate limit
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const limit = parseInt(env.RATE_LIMIT_PER_HOUR || '200');

  // Periodic cleanup
  const now = Date.now();
  for (const [k, v] of rateLimits) {
    if (now > v.resetAt) rateLimits.delete(k);
  }

  if (!checkRateLimit(ip, limit)) {
    return Response.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { messages, system } = body;

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'messages array is required' }, { status: 400 });
    }

    const useModel = env.DEFAULT_MODEL || 'openai/gpt-4o-mini';

    // Build messages array with system prompt
    const apiMessages = [];
    if (system) {
      apiMessages.push({ role: 'system', content: system });
    }
    apiMessages.push(...messages);

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://crystallization-wizard.pages.dev',
        'X-Title': 'Crystallization Wizard',
      },
      body: JSON.stringify({
        model: useModel,
        messages: apiMessages,
        max_tokens: body.max_tokens || 2048,
        temperature: 0.7,
      }),
    });

    if (!openRouterResponse.ok) {
      const errText = await openRouterResponse.text();
      console.error('OpenRouter error:', errText);
      return Response.json({ error: 'AI service temporarily unavailable.' }, { status: 502 });
    }

    const data = await openRouterResponse.json();
    const content = data.choices?.[0]?.message?.content || '';

    return Response.json({ content });
  } catch (err) {
    console.error('Function error:', err);
    return Response.json({ error: 'Internal error. Please try again.' }, { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
