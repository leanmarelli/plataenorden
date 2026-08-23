import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Plata en Orden",
    short_name: "Plata",
    description:
      "Finanzas personales en pesos y dólares: gastos, ahorro, viajes y conversiones, con sync en la nube.",
    start_url: "/resumen",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f5f2",
    theme_color: "#0e6e5c",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
