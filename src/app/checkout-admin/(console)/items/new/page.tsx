import { PageHeader } from "@/components/ui";
import { ProductForm } from "../product-form";
import { logoChoices } from "../logos";

export const metadata = { title: "Add item" };

export default function NewItemPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Add item" description="It appears on the checkout page as soon as it is saved (if shown)." />
      <ProductForm
        logos={logoChoices()}
        values={{ name: "", subtitle: "", period: "12 months", purpose: "", amount_ngn: "", logo: "other", sort_order: "100", active: true }}
      />
    </div>
  );
}
