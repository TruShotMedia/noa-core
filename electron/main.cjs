const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#070910',
    title: 'NoA - Noetic Advisor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    win.loadURL('http://127.0.0.1:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('noa:get-version', () => app.getVersion());

ipcMain.handle('noa:check-for-updates', async () => {
  if (isDev) return { status: 'dev-mode', message: 'Update checks run in packaged builds.' };
  try {
    const result = await autoUpdater.checkForUpdates();
    return { status: 'checking', updateInfo: result?.updateInfo ?? null };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
});

ipcMain.handle('noa:openai-request', async (_event, payload) => {
  const { apiKey, model, input } = payload || {};

  if (!apiKey || !String(apiKey).trim()) {
    return { ok: false, message: 'OpenAI API key is missing.' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-5.5',
        input,
        max_output_tokens: 700
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: data?.error?.message || 'OpenAI request failed.',
        data
      };
    }

    return {
      ok: true,
      text: data.output_text || extractOutputText(data),
      data
    };
  } catch (error) {
    return { ok: false, message: error.message || 'OpenAI request failed.' };
  }
});

function extractOutputText(data) {
  try {
    const output = data?.output || [];
    return output
      .flatMap((item) => item?.content || [])
      .map((content) => content?.text || '')
      .filter(Boolean)
      .join('\n')
      .trim();
  } catch {
    return '';
  }
}
