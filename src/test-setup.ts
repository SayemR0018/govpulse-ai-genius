import { GlobalWindow } from "happy-dom";

const window = new GlobalWindow();
globalThis.window = window as unknown as Window & typeof globalThis;
globalThis.document = window.document;
globalThis.navigator = window.navigator;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLDivElement = window.HTMLDivElement;
globalThis.Element = window.Element;
globalThis.Node = window.Node;
