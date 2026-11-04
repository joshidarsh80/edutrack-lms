import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "EduTrack — Make room for what’s next", template: "%s · EduTrack" },
  description: "Build skills that move you forward with thoughtful courses, expert instructors and a learning rhythm that fits you.",
  openGraph: { title: "EduTrack — Make room for what’s next", description: "A thoughtful learning platform for your next chapter.", siteName: "EduTrack", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
