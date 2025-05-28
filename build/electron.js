// public/electron.js - Fixed main process without external dependencies
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// Simple check for development mode instead of using electron-is-dev
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === 'true' || !app.isPackaged;

let mainWindow;

// Get the user data directory for persistent storage
const userDataPath = app.getPath('userData');
const dataDir = path.join(userDataPath, 'kanban-data');

// Ensure the data directory exists
const ensureDataDir = async () => {
  try {
    await fs.access(dataDir);
  } catch (error) {
    await fs.mkdir(dataDir, { recursive: true });
    console.log('Created data directory:', dataDir);
  }
};

function createWindow() {
  // Get the correct paths for development vs production
  let preloadPath;
  let indexPath;
  
  if (isDev) {
    preloadPath = path.join(__dirname, 'preload.js');
    indexPath = 'http://localhost:3000';
  } else {
    // In production, files are in different locations
    preloadPath = path.join(__dirname, 'preload.js');
    indexPath = `file://${path.join(__dirname, '../build/index.html')}`;
  }

  console.log('Preload script path:', preloadPath);
  console.log('Index path:', indexPath);

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // Security: disable node integration
      contextIsolation: true, // Security: enable context isolation
      enableRemoteModule: false, // Security: disable remote module
      preload: preloadPath, // Use preload script
    },
    titleBarStyle: 'default',
    show: false, // Don't show until ready
  });

  // Load the app
  console.log('Loading URL:', indexPath);
  console.log('isDev:', isDev);
  console.log('app.isPackaged:', app.isPackaged);
  
  mainWindow.loadURL(indexPath);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle navigation - prevent external links from opening in the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// IPC handlers for data persistence
ipcMain.handle('save-data', async (event, key, data) => {
  try {
    await ensureDataDir();
    const filePath = path.join(dataDir, `${key}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Data saved to: ${filePath}`);
    return true;
  } catch (error) {
    console.error('Failed to save data:', error);
    throw error;
  }
});

ipcMain.handle('load-data', async (event, key) => {
  try {
    const filePath = path.join(dataDir, `${key}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    console.log(`Data loaded from: ${filePath}`);
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`No data file found for key: ${key}`);
      return null;
    }
    console.error('Failed to load data:', error);
    throw error;
  }
});

ipcMain.handle('export-data', async (event, key, data) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Kanban Data',
      defaultPath: `kanban-${key}-${new Date().toISOString().split('T')[0]}.json`,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf8');
      return result.filePath;
    }
    return null;
  } catch (error) {
    console.error('Failed to export data:', error);
    throw error;
  }
});

ipcMain.handle('import-data', async (event, key) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Kanban Data',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Failed to import data:', error);
    throw error;
  }
});

// Check if we're running in Electron (for renderer process)
ipcMain.handle('is-electron', () => {
  return true;
});

// App event handlers
app.whenReady().then(async () => {
  await ensureDataDir();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app updates gracefully
app.on('before-quit', async () => {
  console.log('App is quitting, ensuring data is saved...');
  // Give a moment for any pending saves
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    require('electron').shell.openExternal(navigationUrl);
  });
});

// Log the data directory path for debugging
console.log('Kanban data will be stored in:', dataDir);
console.log('App version:', app.getVersion());
console.log('Electron version:', process.versions.electron);
console.log('Node version:', process.versions.node);