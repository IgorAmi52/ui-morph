import { Window } from 'happy-dom';

const window = new Window({ url: 'http://localhost' });

Object.assign(globalThis, {
  window,
  document: window.document,
  HTMLElement: window.HTMLElement,
  Node: window.Node,
  localStorage: window.localStorage,
});
