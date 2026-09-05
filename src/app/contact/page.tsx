import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/types";
import { ContactChrome } from "@/components/ContactChrome";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contacter la rédaction — ${CONTACT_EMAIL}`,
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-8 sm:py-10">
      <ContactChrome email={CONTACT_EMAIL} />
    </div>
  );
}
