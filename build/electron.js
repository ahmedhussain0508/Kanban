// public/electron.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
// const isDev = require('electron-is-dev'); // This line should be REMOVED or commented out

async function createWindow() { // <--- ADD 'async' here
  const { default: isDev } = await import('electron-is-dev'); // <--- ADD this line for dynamic import

  // Create the browser window.
  const win = new BrowserWindow({
    width: 1200,    // Increased width for better multi-board view
    height: 800,    // Increased height
    minWidth: 800,  // Minimum width
    minHeight: 600, // Minimum height
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true // Deprecated, but often seen in examples.
    },
  });

  // Load the React app.
  // In development, load from React's development server.
  // In production, load the built React files.
  win.loadURL(
    isDev
      ? 'http://localhost:3000' // React development server URL
      : `file://${path.join(__dirname, '../build/index.html')}` // Path to built React app
  );

  // Open the DevTools only in development mode.
  if (isDev) {
    win.webContents.openDevTools();
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) { // <--- FIX 'Browser' to 'BrowserWindow'
    createWindow();
  }
});