import { notFound } from "next/navigation";
import { getProduct, StoreError } from "@/lib/payfx/admin-store";
import { LOGOS } from "@/lib/payfx/icons";
import { Alert, PageHeader } from "@/components/ui";
import { ProductForm } from "../product-form";
import { logoChoices } from "../logos";

export const metadata = { title: "Edit item" };

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let row;
  try {
    row = await getProduct(decodeURIComponent(id));
  } catch (e) {
    return <Alert tone="error">{e instanceof StoreError ? e.message : "Could not load this item."}</Alert>;
  }
  if (!row) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit item" description={`ID ${row.id}. Past invoices keep the details they were issued with.`} />
      <ProductForm
        logos={logoChoices()}
        values={{
          id: row.id,
          name: row.name,
          subtitle: row.subtitle ?? "",
          period: row.period,
          purpose: row.purpose,
          amount_ngn: String(row.amount_ngn),
          logo: row.logo in LOGOS ? row.logo : "other",
          sort_order: String(row.sort_order),
          active: row.active,
        }}
      />
    </div>
  );
}
