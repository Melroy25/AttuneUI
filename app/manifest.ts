import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AttuneUI",
    short_name: "AttuneUI",
    description: "A self-learning UI testbed.",
    start_url: "/demo",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [192, 512].map((size) => ({
      src: `/icons/${size}`,
      sizes: `${size}x${size}`,
      type: "image/png",
    })),
  };
}
