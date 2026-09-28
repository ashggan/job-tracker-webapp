import CSSMatrix from "@thednp/dommatrix";

// pdfjs-dist (used by pdf-parse) polyfills DOMMatrix for Node itself, but
// only by requiring the native @napi-rs/canvas package and lifting
// `.DOMMatrix` off it -- fragile in a serverless deployment, since a
// platform-specific native binary isn't reliably traced into the deployed
// function. It only attempts that when `globalThis.DOMMatrix` is still
// unset, so setting it ourselves first (with a pure-JS, dependency-free
// polyfill) makes it skip that path entirely.
if (typeof globalThis.DOMMatrix === "undefined") {
  (globalThis as unknown as { DOMMatrix: unknown }).DOMMatrix = CSSMatrix;
}
