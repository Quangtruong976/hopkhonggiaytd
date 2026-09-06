import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Phòng họp không giấy",
    short_name: "Phòng họp",
    description:
      "Hệ thống điều hành và quản lý công việc nội bộ Tỉnh đoàn",

    start_url: "/",
    display: "standalone",

    background_color: "#f1f5f9",
    theme_color: "#047857",

    orientation: "portrait-primary",

    icons: [
      {
        src: "/app-icon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}