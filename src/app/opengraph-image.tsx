import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name}: pay for anything online, in any currency`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social share image (WhatsApp, X, LinkedIn, Facebook previews). */
export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#0f3f2d", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: "#cdf548", display: "flex", alignItems: "center", justifyContent: "center", color: "#072a1d", fontSize: 44, fontWeight: 800 }}>W</div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>Web<span style={{ color: "#cdf548" }}>Purchase</span></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>
            <span>Pay for anything online,</span>
            <span style={{ color: "#cdf548" }}>in any currency.</span>
          </div>
          <div style={{ fontSize: 30, color: "rgba(255,255,255,0.8)", maxWidth: 1000 }}>
            Subscriptions, exam and visa fees, and shopping abroad. You pay in Naira or your local African currency.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "rgba(255,255,255,0.7)" }}>
          <span>{site.company} · Port Harcourt, Nigeria</span>
          <span style={{ color: "#cdf548" }}>{new URL(site.url).host}</span>
        </div>
      </div>
    ),
    size,
  );
}
