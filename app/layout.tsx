import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fabric Muse / AI 商业出图工作台",
  description: "一个面向服装上新图、AI 模特图、小红书风出图的最小可运行项目骨架。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
