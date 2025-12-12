import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "Saint.Works",
  description: "Creative Director Matt Saint",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
