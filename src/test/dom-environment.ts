import { GlobalWindow } from "happy-dom";

const window = new GlobalWindow();
const globalTarget = globalThis as unknown as Record<string, unknown>;
const windowTarget = window as unknown as Record<string, unknown>;

for (const key of Object.getOwnPropertyNames(window)) {
  if (!(key in globalThis)) {
    try {
      globalTarget[key] = windowTarget[key];
    } catch {
      // ignore
    }
  }
}

globalTarget.window = window;
globalTarget.document = window.document;
globalTarget.navigator = window.navigator;
