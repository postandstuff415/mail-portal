import type { MetadataRoute } from "next";

// Lets clients "Add to Home Screen" so the portal opens like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Post and Stuff Mail",
    short_name: "P&S Mail",
    description: "Check your mail at Post and Stuff, Oakland.",
    start_url: "/login",
    display: "standalone",
    background_color: "#1c1a1d",
    theme_color: "#1c1a1d",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
