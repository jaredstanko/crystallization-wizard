// Chat UI — message rendering, input handling

export class Chat {
  constructor(container, inputEl, sendBtn) {
    this.container = container;
    this.input = inputEl;
    this.sendBtn = sendBtn;
    this.onSend = null; // callback set by app.js
    this.typing = null;

    this.sendBtn.addEventListener('click', () => this._handleSend());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._handleSend();
      }
    });
  }

  _handleSend() {
    const text = this.input.value.trim();
    if (!text || !this.onSend) return;
    this.input.value = '';
    this.input.style.height = 'auto';
    this.onSend(text);
  }

  addMessage(role, text) {
    this.removeTyping();
    const msg = document.createElement('div');
    msg.className = `message message-${role}`;
    msg.innerHTML = `<div class="message-bubble">${this._formatText(text)}</div>`;
    this.container.appendChild(msg);
    this._scrollToBottom();
  }

  showTyping() {
    if (this.typing) return;
    this.typing = document.createElement('div');
    this.typing.className = 'message message-ai typing-indicator';
    this.typing.innerHTML = `<div class="message-bubble"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
    this.container.appendChild(this.typing);
    this._scrollToBottom();
  }

  removeTyping() {
    if (this.typing) {
      this.typing.remove();
      this.typing = null;
    }
  }

  showError(text) {
    this.removeTyping();
    const msg = document.createElement('div');
    msg.className = 'message message-error';
    msg.innerHTML = `<div class="message-bubble">${this._escapeHtml(text)}</div>`;
    this.container.appendChild(msg);
    this._scrollToBottom();
  }

  setEnabled(enabled) {
    this.input.disabled = !enabled;
    this.sendBtn.disabled = !enabled;
    if (enabled) this.input.focus();
  }

  clear() {
    this.container.innerHTML = '';
  }

  _scrollToBottom() {
    this.container.scrollTop = this.container.scrollHeight;
  }

  _formatText(text) {
    // Simple markdown-like formatting
    return this._escapeHtml(text)
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
