import { createPackage } from "@electron/asar";
import {
  cp,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspace = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
const releaseDirectory = resolve(workspace, "desktop-release");
const runtimeDirectory = resolve(releaseDirectory, "win-unpacked");
const stagingDirectory = resolve(workspace, "desktop-staging");
const electronRuntime = resolve(
  workspace,
  "node_modules",
  "electron",
  "dist",
);
const executableResourceEditor = resolve(
  workspace,
  "node_modules",
  "electron-winstaller",
  "vendor",
  "rcedit.exe",
);
const applicationIcon = resolve(
  workspace,
  "src",
  "assets",
  "game",
  "tcg-logo.ico",
);
const packageData = JSON.parse(
  await readFile(resolve(workspace, "package.json"), "utf8"),
);

await rm(runtimeDirectory, { recursive: true, force: true });
await rm(stagingDirectory, { recursive: true, force: true });
await mkdir(releaseDirectory, { recursive: true });
await mkdir(stagingDirectory, { recursive: true });

await cp(electronRuntime, runtimeDirectory, { recursive: true });
await cp(
  applicationIcon,
  resolve(runtimeDirectory, "resources", "tcg-logo.ico"),
);
await cp(resolve(workspace, "dist"), resolve(stagingDirectory, "dist"), {
  recursive: true,
});
await cp(
  resolve(workspace, "electron"),
  resolve(stagingDirectory, "electron"),
  { recursive: true },
);
await writeFile(
  resolve(stagingDirectory, "package.json"),
  JSON.stringify(
    {
      name: packageData.name,
      productName: packageData.productName,
      version: packageData.version,
      main: packageData.main,
    },
    null,
    2,
  ),
);

await createPackage(
  stagingDirectory,
  resolve(runtimeDirectory, "resources", "app.asar"),
);
await rename(
  resolve(runtimeDirectory, "electron.exe"),
  resolve(runtimeDirectory, "Total City Grind.exe"),
);

const packagedExecutable = resolve(
  runtimeDirectory,
  "Total City Grind.exe",
);
const iconResult = spawnSync(
  executableResourceEditor,
  [
    packagedExecutable,
    "--set-icon",
    applicationIcon,
    "--set-version-string",
    "ProductName",
    packageData.productName,
    "--set-version-string",
    "FileDescription",
    packageData.productName,
    "--set-version-string",
    "InternalName",
    packageData.name,
    "--set-version-string",
    "OriginalFilename",
    "Total City Grind.exe",
  ],
  {
    cwd: workspace,
    stdio: "inherit",
  },
);

if (iconResult.status !== 0) {
  process.exit(iconResult.status ?? 1);
}

const builder = spawnSync(
  resolve(workspace, "node_modules", ".bin", "electron-builder.cmd"),
  [
    "--prepackaged",
    runtimeDirectory,
    "--win",
    "nsis",
  ],
  {
    cwd: workspace,
    stdio: "inherit",
    shell: true,
  },
);

if (builder.status !== 0) {
  process.exit(builder.status ?? 1);
}
