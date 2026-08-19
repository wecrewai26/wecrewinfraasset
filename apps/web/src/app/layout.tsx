import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";

export const metadata: Metadata = {
  title: {
    default: "WeCrew InfraAsset",
    template: "%s · InfraAsset",
  },
  description: "On-prem + hybrid infrastructure intelligence — CMDB, DCIM, IPAM, GPU fleet, and Command Centre.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
