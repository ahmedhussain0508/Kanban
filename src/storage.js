// src/storage.js - Simplified storage helper
class ElectronStorage {
  constructor() {
    this.isElectron = this.checkIfElectron();
    this.ipcRenderer = null;
    
    if (this.isElectron) {
      try {
        // Try to get ipcRenderer from window (for packaged app) or require (for dev)
        if (window.require) {
          const { ipcRenderer } = window.require('electron');
          this.ipcRenderer = ipcRenderer;
          console.log('✅ Electron IPC loaded via window.require');
        } else if (window.electron && window.electron.ipcRenderer) {
          this.ipcRenderer = window.electron.ipcRenderer;
          console.log('✅ Electron IPC loaded via window.electron');
        } else {
          console.warn('⚠️ Electron IPC not available, falling back to localStorage');
          this.isElectron = false;
        }
      } catch (error) {
        console.warn('⚠️ Failed to load Electron IPC:', error);
        this.isElectron = false;
      }
    }
  }

  checkIfElectron() {
    // Check multiple ways to detect Electron
    return !!(
      (typeof window !== 'undefined' && window.process && window.process.type) ||
      (typeof window !== 'undefined' && window.require) ||
      (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.indexOf('Electron') >= 0)
    );
  }

  async saveData(key, data) {
    if (this.isElectron && this.ipcRenderer) {
      try {
        await this.ipcRenderer.invoke('save-data', key, data);
        console.log(`✅ Data saved to Electron storage for key: ${key}`);
        return true;
      } catch (error) {
        console.error('❌ Failed to save data via Electron IPC:', error);
        // Fallback to localStorage
        return this.saveToLocalStorage(key, data);
      }
    } else {
      // Running in browser or Electron IPC unavailable, use localStorage
      return this.saveToLocalStorage(key, data);
    }
  }

  async loadData(key) {
    if (this.isElectron && this.ipcRenderer) {
      try {
        const data = await this.ipcRenderer.invoke('load-data', key);
        console.log(`✅ Data loaded from Electron storage for key: ${key}`);
        return data;
      } catch (error) {
        console.error('❌ Failed to load data via Electron IPC:', error);
        // Fallback to localStorage
        return this.loadFromLocalStorage(key);
      }
    } else {
      // Running in browser or Electron IPC unavailable, use localStorage
      return this.loadFromLocalStorage(key);
    }
  }

  saveToLocalStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      console.log(`✅ Data saved to localStorage for key: ${key}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save to localStorage:', error);
      return false;
    }
  }

  loadFromLocalStorage(key) {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        console.log(`✅ Data loaded from localStorage for key: ${key}`);
        return JSON.parse(item);
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to load from localStorage:', error);
      return null;
    }
  }

  async exportData(key) {
    const data = await this.loadData(key);
    if (!data) {
      console.warn('⚠️ No data to export');
      return null;
    }

    if (this.isElectron && this.ipcRenderer) {
      try {
        const filePath = await this.ipcRenderer.invoke('export-data', key, data);
        console.log(`✅ Data exported to: ${filePath}`);
        return filePath;
      } catch (error) {
        console.error('❌ Failed to export data via Electron:', error);
      }
    }
    
    // Browser fallback - create download
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kanban-${key}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('✅ Data downloaded via browser');
      return 'browser-download';
    } catch (error) {
      console.error('❌ Failed to create browser download:', error);
    }
    
    return null;
  }

  async importData(key) {
    if (this.isElectron && this.ipcRenderer) {
      try {
        const data = await this.ipcRenderer.invoke('import-data', key);
        if (data) {
          await this.saveData(key, data);
          console.log(`✅ Data imported for key: ${key}`);
          return data;
        }
      } catch (error) {
        console.error('❌ Failed to import data via Electron:', error);
      }
    }
    
    // Browser fallback - file input
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) {
          resolve(null);
          return;
        }
        
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = JSON.parse(e.target.result);
            await this.saveData(key, data);
            console.log('✅ Data imported via browser file picker');
            resolve(data);
          } catch (error) {
            console.error('❌ Failed to parse imported file:', error);
            reject(error);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }
}

export default new ElectronStorage();