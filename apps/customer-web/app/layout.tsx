import "./styles.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zebepay Customer",
  description: "Customer banking portal for Zebepay.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
