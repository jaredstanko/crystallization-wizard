// Completeness engine — coverage + depth scoring

export class Completeness {
  constructor(modeConfig) {
    this.sections = modeConfig.sections;
    this.config = modeConfig.completeness;
  }

  calculate(crystallizerState) {
    let covered = 0;
    let deep = 0;
    const thin = [];

    this.sections.forEach(s => {
      const items = crystallizerState[s.id] || [];
      if (items.length > 0) {
        covered++;
        const wordCount = items.join(' ').split(/\s+/).length;
        if (items.length >= (this.config.depth_threshold_entries || 2) ||
            wordCount >= (this.config.depth_threshold_words || 50)) {
          deep++;
        } else {
          thin.push(s.id);
        }
      }
    });

    const total = this.sections.length;
    const percentage = Math.round((covered / total) * 100);
    const isMinViable = covered >= (this.config.minimum_sections || Math.ceil(total * 0.7));

    return { covered, total, deep, thin, percentage, isMinViable };
  }

  getAdvisoryMessage(stats) {
    const { percentage, isMinViable, covered, total } = stats;
    if (percentage >= 90) {
      return `This is comprehensive — ${covered} of ${total} areas explored. Ready to download?`;
    }
    if (isMinViable) {
      return `Your file is looking solid — ${covered} of ${total} areas explored. Want to keep going or download what we have?`;
    }
    if (percentage >= 60) {
      return `We're making great progress — ${covered} of ${total} areas explored.`;
    }
    return null;
  }
}
