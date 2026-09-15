import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) locates its worker script relative to
  // wherever its importing chunk lands. Bundling it rewrites/relocates that
  // chunk and breaks the lookup ("Cannot find module '...pdf.worker.mjs'
  // imported from .next/.../chunks/...'"). Excluding it from bundling loads
  // it via real Node `require` from node_modules instead, where the worker
  // file is exactly where pdfjs-dist expects it.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
