import { Trash2 } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Pill } from "@/components/ui";
import { KeywordForm } from "@/components/admin/forms";
import { deleteKeyword } from "@/app/admin/actions";

export const metadata = { title: "Prohibited keywords" };

export default async function KeywordsPage() {
  await requireStaff("keywords.manage");
  const { data } = await createAdminClient().from("prohibited_keywords").select("*").order("category").order("keyword");
  const groups = new Map<string, typeof data>();
  for (const k of data ?? []) groups.set(k.category, [...(groups.get(k.category) ?? []), k]);
  return (
    <div className="space-y-6">
      <PageHeader title="Prohibited keywords" description="Whole-word matches in titles, notes, URLs and product details. 'Block' rejects at submission; 'Flag' marks the request for compliance review." />
      <section className="card"><KeywordForm /></section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...groups.entries()].map(([cat, items]) => (
          <section key={cat} className="card">
            <h2 className="mb-3 font-semibold capitalize">{cat}</h2>
            <ul className="flex flex-wrap gap-2">
              {(items ?? []).map((k) => (
                <li key={k.id}>
                  <form action={deleteKeyword} className="inline-flex items-center gap-1">
                    <input type="hidden" name="id" value={k.id} />
                    <Pill tone={k.severity === "block" ? "red" : "amber"}>
                      {k.keyword}
                      <button className="ml-1 opacity-60 hover:opacity-100" aria-label={`Delete ${k.keyword}`}><Trash2 className="h-3 w-3" /></button>
                    </Pill>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
