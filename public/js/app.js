// App — orchestrator, wires everything together
import { persistence } from './persistence.js';
import { ai } from './ai.js';
import { FSM } from './fsm.js';
import { Crystallizer } from './crystallizer.js';
import { Completeness } from './completeness.js';
import { Preview } from './preview.js';
import { Chat } from './chat.js';

let modeConfig = null;
let fsm = null;
let crystallizer = null;
let completeness = null;
let preview = null;
let chat = null;
let messages = []; // {role: 'user'|'ai', text: string}

async function init() {
  // Get mode from URL params
  const params = new URLSearchParams(window.location.search);
  const modeId = params.get('mode');
  if (!modeId) {
    window.location.href = '/';
    return;
  }

  // Load mode config
  try {
    const res = await fetch(`/modes/${modeId}.json`);
    if (!res.ok) throw new Error('Mode not found');
    modeConfig = await res.json();
  } catch (e) {
    document.body.innerHTML = `<div class="error-page"><h1>Mode not found</h1><p>${modeId}</p><a href="/">Back to modes</a></div>`;
    return;
  }

  // Update header
  document.getElementById('mode-name').textContent = modeConfig.name;
  document.title = `${modeConfig.name} — Crystallization Wizard`;

  // Initialize modules
  fsm = new FSM(modeConfig);
  crystallizer = new Crystallizer(modeConfig);
  completeness = new Completeness(modeConfig);
  preview = new Preview(document.getElementById('preview-content'), modeConfig);
  chat = new Chat(
    document.getElementById('chat-messages'),
    document.getElementById('chat-input'),
    document.getElementById('send-btn')
  );

  // Restore saved state
  const savedMessages = persistence.loadMessages(modeId);
  const savedState = persistence.loadState(modeId);
  const savedFsm = persistence.loadFsm(modeId);

  if (savedMessages.length > 0) {
    messages = savedMessages;
    crystallizer.restore(savedState);
    fsm.restore(savedFsm);
    // Re-render saved messages
    messages.forEach(m => chat.addMessage(m.role, m.text));
    // Welcome back message for returning users
    const populated = crystallizer.getPopulatedSections();
    const empty = crystallizer.getEmptySections();
    if (populated.length > 0) {
      const resumeMsg = `Welcome back! You've explored ${populated.length} of ${modeConfig.sections.length} areas so far. Pick up where you left off, or take the conversation in a new direction.`;
      chat.addMessage('system', resumeMsg);
    }
  } else {
    // Fresh conversation — send opening prompt
    const openingText = modeConfig.opening_prompt;
    messages.push({ role: 'ai', text: openingText });
    chat.addMessage('ai', openingText);
    save();
  }

  // Wire preview edit callback
  preview.onEdit = (sectionId, index, newText) => {
    crystallizer.editItem(sectionId, index, newText);
    updatePreview();
    save();
  };

  // Render preview
  updatePreview();

  // Wire send handler
  chat.onSend = handleUserMessage;

  // Wire buttons
  document.getElementById('download-btn').addEventListener('click', handleDownload);
  document.getElementById('copy-btn').addEventListener('click', handleCopy);
  document.getElementById('restart-btn').addEventListener('click', handleRestart);
  document.getElementById('toggle-preview').addEventListener('click', togglePreview);

  // Auto-resize textarea
  const input = document.getElementById('chat-input');
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
}

async function handleUserMessage(text) {
  // Add user message
  messages.push({ role: 'user', text });
  chat.addMessage('user', text);
  chat.setEnabled(false);
  chat.showTyping();
  save();

  try {
    // Build system prompt with context
    const systemPrompt = buildSystemPrompt();

    // Build message history for AI (last 15 messages)
    const recentMessages = messages.slice(-15).map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.text
    }));

    // Call AI
    const { chatText, extraction } = await ai.chat(recentMessages, systemPrompt);

    // Process extraction
    if (extraction) {
      crystallizer.merge(extraction);
      fsm.markVisitedFromExtraction(extraction);
    }

    // Add AI response
    messages.push({ role: 'ai', text: chatText });
    chat.addMessage('ai', chatText);

    // Update preview
    updatePreview();

    // Check for advisory message
    const stats = completeness.calculate(crystallizer.serialize());
    const advisory = completeness.getAdvisoryMessage(stats);
    if (advisory && stats.isMinViable && !window._advisoryShown) {
      window._advisoryShown = true;
      // Show as a subtle system message after a delay
      setTimeout(() => {
        chat.addMessage('system', advisory);
      }, 1000);
    }

    save();
  } catch (e) {
    chat.showError(`Something went wrong: ${e.message}. Try again.`);
    console.error('AI error:', e);
  } finally {
    chat.setEnabled(true);
  }
}

function buildSystemPrompt() {
  const state = crystallizer.toStateJSON();
  const gaps = fsm.getUnvisited();
  const coverage = fsm.getCoverageInfo();
  const nextSection = fsm.getNextSection();

  let prompt = modeConfig.system_prompt;
  prompt += `\n\nCURRENT STATE (what has been extracted so far):\n${state}`;
  prompt += `\n\nCOVERAGE: ${coverage.visited}/${coverage.total} sections explored.`;
  if (gaps.length > 0) {
    prompt += `\nUNEXPLORED SECTIONS: ${gaps.join(', ')}`;
  }
  if (nextSection) {
    prompt += `\nSUGGESTED NEXT TOPIC: ${nextSection.title} — ${nextSection.description}`;
    const nextPrompt = fsm.getNextPrompt(nextSection.id);
    if (nextPrompt) {
      prompt += `\nSUGGESTED QUESTION: ${nextPrompt}`;
    }
  }
  return prompt;
}

function updatePreview() {
  const state = crystallizer.serialize();
  const stats = completeness.calculate(state);
  preview.render(state, stats);
}

function save() {
  const modeId = modeConfig.id;
  persistence.saveMessages(modeId, messages);
  persistence.saveState(modeId, crystallizer.serialize());
  persistence.saveFsm(modeId, fsm.serialize());
}

function handleDownload() {
  const md = crystallizer.toMarkdown();
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = modeConfig.output_filename;
  a.click();
  URL.revokeObjectURL(url);
}

function handleCopy() {
  const md = crystallizer.toMarkdown();
  navigator.clipboard.writeText(md).then(() => {
    const btn = document.getElementById('copy-btn');
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = original; }, 2000);
  });
}

function handleRestart() {
  if (!confirm('Start over? This will clear your conversation and all extracted content.')) return;
  persistence.clear(modeConfig.id);
  window.location.reload();
}

function togglePreview() {
  const previewPane = document.getElementById('preview-pane');
  previewPane.classList.toggle('mobile-visible');
  const btn = document.getElementById('toggle-preview');
  btn.textContent = previewPane.classList.contains('mobile-visible') ? 'Chat' : 'Preview';
}

// Init on load
document.addEventListener('DOMContentLoaded', init);
