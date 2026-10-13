import type { Metadata, Viewport } from "next";
import "./globals.css";
import { t } from "@/lib/strings";

export const metadata: Metadata = {
  title: { default: t.appName, template: `%s · ${t.appName}` },
  description: t.appTagline,
  applicationName: t.appName,
  appleWebApp: { capable: true, title: t.appName, statusBarStyle: "default" },
  robots: { index: false, follow: false },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf7f5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
