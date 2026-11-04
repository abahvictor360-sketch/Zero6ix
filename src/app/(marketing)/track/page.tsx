import type { Metadata } from "next";
import { TrackForm } from "./track-form";

export const metadata: Metadata = { title: "Track your order", description: "Check the status of your Web Purchase order with your order ID and email or phone." };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  return (
    <section className="container max-w-3xl py-16">
      <div className="mb-8 text-center">
        <p className="eyebrow">Track order</p>
        <h1 className="h2 mt-4">Where&apos;s my order?</h1>
        <p className="muted mt-2">Enter your order ID and the email or phone number you used.</p>
      </div>
      <TrackForm initialRef={ref?.toUpperCase().slice(0, 20)} />
    </section>
  );
}
