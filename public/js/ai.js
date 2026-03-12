// AI client — calls CF Worker proxy and parses structured response

export const ai = {
  async chat(messages, systemPrompt) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, system: systemPrompt })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return this.parseResponse(data.content);
  },

  parseResponse(raw) {
    // Try to parse [CHAT]...[/CHAT] and [EXTRACT]...[/EXTRACT]
    const chatMatch = raw.match(/\[CHAT\]([\s\S]*?)\[\/CHAT\]/);
    const extractMatch = raw.match(/\[EXTRACT\]([\s\S]*?)\[\/EXTRACT\]/);

    let chatText = '';
    let extraction = null;

    if (chatMatch) {
      chatText = chatMatch[1].trim();
    } else {
      // Fallback: if no delimiters, treat entire response as chat
      chatText = raw.replace(/\[EXTRACT\][\s\S]*?\[\/EXTRACT\]/, '').trim();
    }

    if (extractMatch) {
      try {
        extraction = JSON.parse(extractMatch[1].trim());
      } catch (e) {
        console.warn('Failed to parse extraction JSON:', e);
      }
    }

    return { chatText, extraction };
  }
};
