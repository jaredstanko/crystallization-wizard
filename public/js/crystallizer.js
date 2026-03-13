// Crystallizer — merges extraction JSON into slot state

export class Crystallizer {
  constructor(modeConfig) {
    this.sections = modeConfig.sections;
    this.preamble = modeConfig.preamble;
    // Initialize empty slots for each section
    this.state = {};
    this.sections.forEach(s => { this.state[s.id] = []; });
  }

  restore(saved) {
    if (!saved) return;
    // Merge saved state, keeping section structure
    this.sections.forEach(s => {
      this.state[s.id] = saved[s.id] || [];
    });
  }

  serialize() {
    return { ...this.state };
  }

  merge(extraction) {
    if (!extraction) return;
    Object.entries(extraction).forEach(([sectionId, items]) => {
      if (!this.state[sectionId]) return; // ignore unknown sections
      if (!Array.isArray(items)) return;
      items.forEach(item => {
        if (typeof item === 'string' && item.trim()) {
          // Avoid duplicates (simple string match)
          const normalized = item.trim();
          if (!this.state[sectionId].includes(normalized)) {
            this.state[sectionId].push(normalized);
          }
        }
      });
    });
  }

  backup() {
    return JSON.parse(JSON.stringify(this.state));
  }

  restoreFromBackup(backupState) {
    if (!backupState) return;
    this.sections.forEach(s => {
      this.state[s.id] = backupState[s.id] || [];
    });
  }

  editItem(sectionId, index, newText) {
    if (!this.state[sectionId]) return false;
    if (index < 0 || index >= this.state[sectionId].length) return false;
    this.state[sectionId][index] = newText.trim();
    return true;
  }

  getSectionContent(sectionId) {
    return this.state[sectionId] || [];
  }

  getPopulatedSections() {
    return this.sections.filter(s => this.state[s.id]?.length > 0);
  }

  getEmptySections() {
    return this.sections.filter(s => this.state[s.id]?.length === 0);
  }

  toMarkdown() {
    let md = this.preamble + '\n';

    this.sections.forEach(s => {
      const items = this.state[s.id];
      if (items.length > 0) {
        md += `${s.output_header}\n\n`;
        items.forEach(item => {
          md += `- ${item}\n`;
        });
        md += '\n';
      }
    });

    return md.trim() + '\n';
  }

  toStateJSON() {
    // For sending to AI as context
    const populated = {};
    this.sections.forEach(s => {
      if (this.state[s.id]?.length > 0) {
        populated[s.id] = this.state[s.id];
      }
    });
    return JSON.stringify(populated);
  }
}
