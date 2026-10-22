import type { MetadataRoute } from "next"

/** Web app manifest: makes DayBloom installable (served at /manifest.webmanifest). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "DayBloom",
    short_name: "DayBloom",
    description:
      "Plan your day, track your progress, and watch your life bloom.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["productivity", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
