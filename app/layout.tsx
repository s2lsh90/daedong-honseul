import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  title: "대동혼술지도",
  description: "서울 혼술바 실시간 남녀 현황 지도",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script
          src="//dapi.kakao.com/v2/maps/sdk.js?appkey=65f89f3c518bd9cb7689641cf9cfde13&autoload=false"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
