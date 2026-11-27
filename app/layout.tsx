import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AttuneUI",
  description: "A self-learning UI that adapts to friction and measures whether it helped.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
