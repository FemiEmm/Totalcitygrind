const path = require("node:path");
const { mkdir, readdir } = require("node:fs/promises");
const { pathToFileURL } = require("node:url");
const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  shell,
} = require("electron");

const isDevelopment = !app.isPackaged;
const SUPPORTED_MUSIC_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".flac"]);

function getCustomMusicDirectory() {
  return path.join(app.getPath("documents"), "Total City Grind", "Music");
}

async function ensureCustomMusicDirectory() {
  const directory = getCustomMusicDirectory();
  await mkdir(directory, { recursive: true });
  return directory;
}

async function listCustomMusicTracks() {
  const directory = await ensureCustomMusicDirectory();
  const entries = await readdir(directory, { withFileTypes: true });
  const tracks = entries
    .filter((entry) => entry.isFile() && SUPPORTED_MUSIC_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }))
    .map((entry) => {
      const extension = path.extname(entry.name);
      const label = path.basename(entry.name, extension);
      const separator = label.indexOf(" - ");
      return {
        id: `custom-${Buffer.from(entry.name).toString("base64url")}`,
        title: separator > 0 ? label.slice(separator + 3).trim() : label,
        artist: separator > 0 ? label.slice(0, separator).trim() : "My Music",
        source: pathToFileURL(path.join(directory, entry.name)).href,
        custom: true,
      };
    });
  return { directory, tracks };
}

ipcMain.handle("tcg-cache:clear", async event => {
  await event.sender.session.clearCache();
});

ipcMain.handle("tcg-music:list", () => listCustomMusicTracks());
ipcMain.handle("tcg-music:open-folder", async () => {
  const directory = await ensureCustomMusicDirectory();
  const error = await shell.openPath(directory);
  return { directory, error };
});
function getSenderWindow(event) { return BrowserWindow.fromWebContents(event.sender); }
ipcMain.on("tcg-window:minimize", e => getSenderWindow(e)?.minimize());
ipcMain.handle("tcg-window:toggle-maximize", e => { const w=getSenderWindow(e); if(!w)return false; w.isMaximized()?w.unmaximize():w.maximize(); return w.isMaximized(); });
ipcMain.on("tcg-window:close", e => getSenderWindow(e)?.close());

function createGameWindow() {
  const gameWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1024,
    minHeight: 576,
    backgroundColor: "#071f50",
    autoHideMenuBar: true,
    frame: false,
    show: false,
    title: "Total City Grind",
    icon: app.isPackaged
      ? path.join(process.resourcesPath, "tcg-logo.ico")
      : path.join(__dirname, "..", "src", "assets", "game", "tcg-logo.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // A hidden Windows game window should not continue consuming a full
      // simulation/render budget. The renderer also pauses on visibility loss.
      backgroundThrottling: true,
    },
  });

  gameWindow.loadFile(
    path.join(__dirname, "..", "dist", "index.html"),
  );

  gameWindow.once("ready-to-show", () => {
    gameWindow.show();
    gameWindow.focus();
  });

  const sendWindowState=()=>!gameWindow.isDestroyed()&&gameWindow.webContents.send("tcg-window:maximized",gameWindow.isMaximized());
  gameWindow.on("maximize",sendWindowState);
  gameWindow.on("unmaximize",sendWindowState);

  gameWindow.webContents.setWindowOpenHandler(() => ({
    action: "deny",
  }));

  gameWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") {
      return;
    }

    if (input.key === "F11") {
      event.preventDefault();
      gameWindow.setFullScreen(!gameWindow.isFullScreen());
    }

    if (input.key === "F12") {
      event.preventDefault();
      gameWindow.webContents.toggleDevTools();
    }
  });

  if (isDevelopment && process.env.LAGOS_EXPERIENCE_DEVTOOLS === "1") {
    gameWindow.webContents.openDevTools({ mode: "detach" });
  }
}

app.setAppUserModelId("com.lagosexperience.game");

app.whenReady().then(async () => {
  await ensureCustomMusicDirectory();
  Menu.setApplicationMenu(null);
  createGameWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createGameWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
