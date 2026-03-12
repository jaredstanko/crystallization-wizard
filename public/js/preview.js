// Preview — renders crystallized state as markdown in sidebar

export class Preview {
  constructor(container, modeConfig) {
    this.container = container;
    this.sections = modeConfig.sections;
  }

  render(crystallizerState, completenessStats) {
    let html = '';

    this.sections.forEach(s => {
      const items = crystallizerState[s.id] || [];
      if (items.length > 0) {
        html += `<div class="preview-section populated">`;
        html += `<h3>${s.title}</h3>`;
        html += `<ul>`;
        items.forEach(item => {
          html += `<li>${this._escapeHtml(item)}</li>`;
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
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
