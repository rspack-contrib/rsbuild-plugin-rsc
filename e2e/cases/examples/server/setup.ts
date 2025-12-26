import path from "node:path";
import fs from "node:fs/promises";
import os from 'node:os';
import { fileURLToPath } from "node:url";
import { type Dev, test } from "@e2e/helper";
import type { Page } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_DIR = path.resolve(__dirname, "../../../../examples/server");

test.beforeEach(async () => {
    process.env.TODOS_FILE = path.join(os.tmpdir(), `todos-${Date.now()}.json`);
});

test.afterEach(async () => {
    try {
        await fs.unlink(process.env.TODOS_FILE!);
    } catch {
    }
});

export const setup = async (dev: Dev, page: Page) => {
  const rsbuild = await dev({
    cwd: PROJECT_DIR,
  });
  page.goto(`http://localhost:${rsbuild.port}`);
  return rsbuild;
};
