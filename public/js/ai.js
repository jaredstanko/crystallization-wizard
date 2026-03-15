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

  async importDocument(text, modeConfig) {
    const sectionList = modeConfig.sections.map(s =>
      `- ${s.id}: ${s.title} — ${s.description}`
    ).join('\n');

    const systemPrompt = `You are analyzing an existing document to extract content into a structured framework.

SECTIONS AVAILABLE:
${sectionList}

INSTRUCTIONS:
1. Read the entire document carefully.
2. Extract every meaningful piece of content into the most appropriate section.
3. Content may belong in multiple sections — extract to all relevant ones.
4. Condense verbose passages into concise, meaningful statements.
5. Preserve the user's voice and intent — don't over-sanitize.
6. If content doesn't fit any section, place it in an "unmatched" key.

RESPONSE FORMAT — you MUST use this exact format:
[IMPORT_SUMMARY]
Brief summary: how many items extracted, which sections populated, what didn't fit.
[/IMPORT_SUMMARY]
[EXTRACT]
{"section_id": ["item 1", "item 2"], "unmatched": ["content that didn't fit"]}
[/EXTRACT]`;

    const messages = [{ role: 'user', content: text }];

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, system: systemPrompt, max_tokens: 4096 })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return this.parseImportResponse(data.content);
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

    // Fallback: if no [EXTRACT] block, look for bare JSON object with array values
    if (!extraction) {
      const jsonMatch = raw.match(/\{[^{}]*"[a-z_]+":\s*\[[\s\S]*?\]\s*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          // Validate it looks like an extraction (has string array values)
          const isExtraction = Object.values(parsed).every(v =>
            Array.isArray(v) && v.every(item => typeof item === 'string')
          );
          if (isExtraction && Object.keys(parsed).length > 0) {
            extraction = parsed;
            // Remove the JSON from chatText to avoid showing raw JSON to user
            chatText = chatText.replace(jsonMatch[0], '').trim();
            console.warn('Used fallback extraction (no [EXTRACT] delimiters):', extraction);
          }
        } catch (e) {
          // Not valid JSON, ignore
        }
      }
    }

    return { chatText, extraction };
  },

  parseImportResponse(raw) {
    const summaryMatch = raw.match(/\[IMPORT_SUMMARY\]([\s\S]*?)\[\/IMPORT_SUMMARY\]/);
    const extractMatch = raw.match(/\[EXTRACT\]([\s\S]*?)\[\/EXTRACT\]/);

    let summary = '';
    let extraction = null;
    let unmatched = [];

    if (summaryMatch) {
      summary = summaryMatch[1].trim();
    } else {
      // Fallback: everything before [EXTRACT] is the summary
      summary = raw.replace(/\[EXTRACT\][\s\S]*?\[\/EXTRACT\]/, '').trim();
    }

    if (extractMatch) {
      try {
        const parsed = JSON.parse(extractMatch[1].trim());
        // Separate unmatched from regular extraction
        if (parsed.unmatched) {
          unmatched = parsed.unmatched;
          delete parsed.unmatched;
        }
        extraction = parsed;
      } catch (e) {
        console.warn('Failed to parse import extraction JSON:', e);
      }
    }

    return { summary, extraction, unmatched };
  }
};
