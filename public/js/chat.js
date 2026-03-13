// Chat UI — message rendering, input handling, import UI

export class Chat {
  constructor(container, inputEl, sendBtn) {
    this.container = container;
    this.input = inputEl;
    this.sendBtn = sendBtn;
    this.onSend = null; // callback set by app.js
    this.onImport = null; // callback for document import
    this.typing = null;
    this._importBanner = null;

    this.sendBtn.addEventListener('click', () => this._handleSend());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._handleSend();
      }
    });

    // Paste detection for import
    this.input.addEventListener('paste', (e) => {
      setTimeout(() => {
        if (this.input.value.length > 500) {
          this._showImportBanner();
        }
      }, 50);
    });

    // Wire import button
    const importBtn = document.getElementById('import-btn');
    if (importBtn) {
      importBtn.addEventListener('click', () => this._showImportModal());
    }
  }

  _handleSend() {
    this._hideImportBanner();
    const text = this.input.value.trim();
    if (!text || !this.onSend) return;
    this.input.value = '';
    this.input.style.height = 'auto';
    this.onSend(text);
  }

  _showImportBanner() {
    if (this._importBanner) return;
    this._importBanner = document.createElement('div');
    this._importBanner.className = 'import-banner';
    this._importBanner.innerHTML = `
      <span>This looks like a document. Want me to import and categorize it?</span>
      <button class="import-banner-btn import-banner-yes">Import</button>
      <button class="import-banner-btn import-banner-no">Send as message</button>
    `;
    const inputArea = this.input.closest('.chat-input-area');
    inputArea.parentNode.insertBefore(this._importBanner, inputArea);

    this._importBanner.querySelector('.import-banner-yes').addEventListener('click', () => {
      const text = this.input.value.trim();
      this.input.value = '';
      this.input.style.height = 'auto';
      this._hideImportBanner();
      if (text && this.onImport) this.onImport(text);
    });

    this._importBanner.querySelector('.import-banner-no').addEventListener('click', () => {
      this._hideImportBanner();
    });
  }

  _hideImportBanner() {
    if (this._importBanner) {
      this._importBanner.remove();
      this._importBanner = null;
    }
  }

  _showImportModal() {
    const modal = document.createElement('div');
    modal.className = 'import-modal-overlay';
    modal.innerHTML = `
      <div class="import-modal">
        <h3>Import Document</h3>
        <p class="import-modal-desc">Paste your existing document below, or upload a .txt/.md file. The AI will sort the content into sections.</p>
        <textarea class="import-modal-textarea" placeholder="Paste your document here..." rows="12"></textarea>
        <div class="import-modal-actions">
          <label class="import-file-label">
            <input type="file" accept=".txt,.md,.text,.markdown" class="import-file-input">
            Upload File
          </label>
          <div class="import-modal-right">
            <button class="import-modal-cancel">Cancel</button>
            <button class="import-modal-submit">Import</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const textarea = modal.querySelector('.import-modal-textarea');
    const fileInput = modal.querySelector('.import-file-input');
    const submitBtn = modal.querySelector('.import-modal-submit');
    const cancelBtn = modal.querySelector('.import-modal-cancel');

    // File upload
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { textarea.value = reader.result; };
      reader.readAsText(file);
    });

    // Submit
    submitBtn.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (!text) return;
      modal.remove();
      if (this.onImport) this.onImport(text);
    });

    // Cancel
    cancelBtn.addEventListener('click', () => modal.remove());

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    textarea.focus();
  }

  showUndoImport(onUndo) {
    const msg = document.createElement('div');
    msg.className = 'message message-system';
    msg.innerHTML = `<div class="message-bubble">Import complete. <button class="undo-import-btn">Undo import</button></div>`;
    this.container.appendChild(msg);
    msg.querySelector('.undo-import-btn').addEventListener('click', () => {
      onUndo();
      msg.remove();
    });
    this._scrollToBottom();
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
    const importBtn = document.getElementById('import-btn');
    if (importBtn) importBtn.disabled = !enabled;
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
