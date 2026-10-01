import {
  cp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";

const workspace = resolve(
  new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
);
const staging = resolve(workspace, "desktop-staging");
const packageData = JSON.parse(
  await readFile(resolve(workspace, "package.json"), "utf8"),
);

await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
await cp(resolve(workspace, "dist"), resolve(staging, "dist"), {
  recursive: true,
});
await cp(resolve(workspace, "electron"), resolve(staging, "electron"), {
  recursive: true,
});
await writeFile(
  resolve(staging, "package.json"),
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

console.log(`Prepared desktop staging directory: ${staging}`);
