type PixelWindow = Window & { fbq?: (...args: unknown[]) => void };

// Only count a completed, successfully saved contact form as a lead.
export function trackLead() {
  if (typeof window === "undefined") return;
  (window as PixelWindow).fbq?.("track", "Lead");
}
