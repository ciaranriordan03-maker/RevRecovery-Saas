import type { Metadata } from "next";
import localFont from "next/font/local";
import { PlausibleProvider } from "./components/analytics/plausible-provider";
import "./globals.css";

const inter = localFont({
  display: "swap",
  src: "./fonts/InterVariable.woff2",
  variable: "--font-inter",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "RevRecovery | SaaS Churn Recovery",
  description: "Recover failed SaaS payments with automated retry flows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <PlausibleProvider />
        {children}
      </body>
    </html>
  );
}
