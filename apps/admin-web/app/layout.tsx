import "./styles.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zebepay Admin",
  description: "Operations and compliance console for Zebepay.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
