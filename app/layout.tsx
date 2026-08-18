import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "멀티미디어콘텐츠제작전문가 CBT",
  description: "멀티미디어콘텐츠제작전문가 능력단위별 이론 학습과 CBT 문제풀이",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
