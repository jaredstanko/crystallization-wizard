// Preview — renders crystallized state in sidebar with inline editing (v3.1)

export class Preview {
  constructor(container, modeConfig) {
    this.container = container;
    this.sections = modeConfig.sections;
    this.onEdit = null; // callback(sectionId, index, newText)
  }

  render(crystallizerState, completenessStats) {
    let html = '';

    this.sections.forEach(s => {
      const items = crystallizerState[s.id] || [];
      if (items.length > 0) {
        html += `<div class="preview-section populated">`;
        html += `<h3>${s.title}</h3>`;
        html += `<ul>`;
        items.forEach((item, idx) => {
          html += `<li class="preview-item" data-section="${s.id}" data-index="${idx}">${this._escapeHtml(item)}</li>`;
        });
        html += `</ul></div>`;
      } else {
        html += `<div class="preview-section empty">`;
        html += `<h3>${s.title}</h3>`;
        html += `<p class="muted">(not yet explored)</p>`;
        html += `</div>`;
      }
    });

    // Progress bar
    const { covered, total, percentage } = completenessStats;
    html += `<div class="preview-progress">`;
    html += `<div class="progress-text">${covered} of ${total} areas explored</div>`;
    html += `<div class="progress-bar"><div class="progress-fill" style="width:${percentage}%"></div></div>`;
    html += `</div>`;

    this.container.innerHTML = html;
    this._bindEditHandlers();
  }

  _bindEditHandlers() {
    this.container.querySelectorAll('.preview-item').forEach(li => {
      li.addEventListener('dblclick', (e) => this._startEdit(e.currentTarget));
    });
  }

  _startEdit(li) {
    if (li.querySelector('input')) return; // already editing
    const sectionId = li.dataset.section;
    const index = parseInt(li.dataset.index);
    const originalText = li.textContent;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'preview-edit-input';
    input.value = originalText;

    li.textContent = '';
    li.appendChild(input);
    input.focus();
    input.select();

    const commit = () => {
      const newText = input.value.trim();
      if (newText && newText !== originalText && this.onEdit) {
        this.onEdit(sectionId, index, newText);
      } else {
        li.textContent = originalText;
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        li.textContent = originalText;
      }
    });

    input.addEventListener('blur', () => {
      // Only restore if input still exists (not already committed)
      if (li.contains(input)) {
        commit();
      }
    });
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
