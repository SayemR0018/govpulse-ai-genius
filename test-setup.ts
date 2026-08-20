import { GlobalWindow, Window } from "happy-dom";

const window = new Window();
const globalWindow = new GlobalWindow();

// Register global window properties
Object.assign(globalThis, {
  window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  Node: window.Node,
  DocumentFragment: window.DocumentFragment,
  CustomEvent: window.CustomEvent,
  Event: window.Event,
});
