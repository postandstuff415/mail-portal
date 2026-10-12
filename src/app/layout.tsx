import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Post and Stuff Mail",
  description: "Mail portal for Post and Stuff clients",
  appleWebApp: { capable: true, title: "P&S Mail", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#1c1a1d" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[#1c1a1d] font-sans antialiased print:bg-white`}
      >
        {children}
      </body>
    </html>
  );
}
