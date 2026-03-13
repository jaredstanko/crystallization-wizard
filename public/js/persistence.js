// Persistence — localStorage save/restore per mode
const PREFIX = 'cw3_';

export const persistence = {
  _key(modeId, suffix) {
    return `${PREFIX}${modeId}_${suffix}`;
  },

  saveMessages(modeId, messages) {
    try {
      localStorage.setItem(this._key(modeId, 'messages'), JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save messages:', e);
    }
  },

  loadMessages(modeId) {
    try {
      const raw = localStorage.getItem(this._key(modeId, 'messages'));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveState(modeId, state) {
    try {
      localStorage.setItem(this._key(modeId, 'state'), JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  },

  loadState(modeId) {
    try {
      const raw = localStorage.getItem(this._key(modeId, 'state'));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveFsm(modeId, fsm) {
    try {
      localStorage.setItem(this._key(modeId, 'fsm'), JSON.stringify(fsm));
    } catch (e) {
      console.warn('Failed to save FSM:', e);
    }
  },

  loadFsm(modeId) {
    try {
      const raw = localStorage.getItem(this._key(modeId, 'fsm'));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveBackup(modeId, state) {
    try {
      localStorage.setItem(this._key(modeId, 'backup'), JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save backup:', e);
    }
  },

  loadBackup(modeId) {
    try {
      const raw = localStorage.getItem(this._key(modeId, 'backup'));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  clearBackup(modeId) {
    localStorage.removeItem(this._key(modeId, 'backup'));
  },

  clear(modeId) {
    ['messages', 'state', 'fsm', 'backup'].forEach(suffix => {
      localStorage.removeItem(this._key(modeId, suffix));
    });
  }
};
