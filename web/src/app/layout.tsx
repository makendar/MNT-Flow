import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MNT Flow — Manufacturing, Customer & Cash Intelligence", template: "%s · MNT Flow" },
  description: "One place to track customer orders, resolve payment blockers, manage follow-ups, and understand what is preventing cash from coming in.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
