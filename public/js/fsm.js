// FSM — Finite State Machine for conversation flow

export class FSM {
  constructor(modeConfig) {
    this.sections = modeConfig.sections;
    this.visited = new Set();
    this.current = this.sections[0]?.id || null;
    this.promptIndex = {}; // track which prompt to use next per section
    this.sections.forEach(s => { this.promptIndex[s.id] = 0; });
  }

  restore(saved) {
    if (!saved) return;
    this.visited = new Set(saved.visited || []);
    this.current = saved.current || this.sections[0]?.id;
    this.promptIndex = saved.promptIndex || {};
  }

  serialize() {
    return {
      visited: [...this.visited],
      current: this.current,
      promptIndex: this.promptIndex
    };
  }

  markVisited(sectionId) {
    this.visited.add(sectionId);
  }

  markVisitedFromExtraction(extraction) {
    if (!extraction) return;
    Object.keys(extraction).forEach(id => {
      if (extraction[id]?.length > 0) {
        this.visited.add(id);
      }
    });
  }

  getUnvisited() {
    return this.sections
      .filter(s => !this.visited.has(s.id))
      .map(s => s.id);
  }

  getNextSection() {
    // Prefer sections whose dependencies are met
    const unvisited = this.sections.filter(s => !this.visited.has(s.id));

    // First try sections with satisfied dependencies
    const ready = unvisited.filter(s => {
      if (!s.depends_on) return true;
      return s.depends_on.every(dep => this.visited.has(dep));
    });

    // Prefer non-optional sections
    const required = ready.filter(s => !s.optional);
    if (required.length > 0) return required[0];
    if (ready.length > 0) return ready[0];
    if (unvisited.length > 0) return unvisited[0];
    return null;
  }

  getNextPrompt(sectionId) {
    const section = this.sections.find(s => s.id === sectionId);
    if (!section) return null;
    const idx = this.promptIndex[sectionId] || 0;
    if (idx >= section.prompts.length) return null;
    this.promptIndex[sectionId] = idx + 1;
    return section.prompts[idx];
  }

  setCurrent(sectionId) {
    this.current = sectionId;
  }

  getCoverageInfo() {
    return {
      visited: this.visited.size,
      total: this.sections.length,
      percentage: Math.round((this.visited.size / this.sections.length) * 100)
    };
  }
}
