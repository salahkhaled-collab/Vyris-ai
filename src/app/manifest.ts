import type { MetadataRoute } from "next";

/** Lets people add Vyris to their phone's home screen. On iPhone that's required for notifications. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vyris",
    short_name: "Vyris",
    description: "Your AI chief of staff: a sorted inbox and a short brief on what matters today.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f4f1ec",
    theme_color: "#1e1a15",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
