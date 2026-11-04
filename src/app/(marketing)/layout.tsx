import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { ContactButton } from "@/components/site/contact-button";
import { getCurrentUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/permissions";
import { JsonLd } from "@/components/json-ld";
import { organizationSchema, websiteSchema } from "@/lib/seo";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  return (
    <>
      <SiteHeader signedIn={!!user} isStaff={isStaffRole(user?.profile.role)} />
      <main id="main">{children}</main>
      <SiteFooter />
      <ContactButton />
      <JsonLd data={[organizationSchema(), websiteSchema()]} />
    </>
  );
}
