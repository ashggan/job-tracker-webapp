import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) locates its worker script relative to
  // wherever its importing chunk lands. Bundling it rewrites/relocates that
  // chunk and breaks the lookup ("Cannot find module '...pdf.worker.mjs'
  // imported from .next/.../chunks/...'"). Excluding it from bundling loads
  // it via real Node `require` from node_modules instead, where the worker
  // file is exactly where pdfjs-dist expects it.
  //
  // @napi-rs/canvas is pdfjs-dist's own Node DOMMatrix polyfill source (it
  // does `require("@napi-rs/canvas")` internally and lifts `.DOMMatrix` from
  // it). It ships a native binary, so it needs the same real-require
  // treatment -- bundled, the binary doesn't get traced/copied correctly,
  // the require throws, pdfjs-dist silently skips the polyfill, and anything
  // touching DOMMatrix later crashes with "DOMMatrix is not defined".
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
