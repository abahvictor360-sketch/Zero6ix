/** Pure keyword matcher mirroring public.match_prohibited_keywords() in SQL. */
export interface Keyword {
  keyword: string;
  severity: "flag" | "block";
  category?: string;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function matchKeywords(text: string, keywords: Keyword[]): Keyword[] {
  const haystack = text.toLowerCase();
  return keywords.filter((k) =>
    new RegExp(`(^|[^a-z0-9])${escape(k.keyword.toLowerCase())}([^a-z0-9]|$)`).test(haystack),
  );
}

export function assessRequestText(text: string, keywords: Keyword[]) {
  const matches = matchKeywords(text, keywords);
  return {
    blocked: matches.filter((m) => m.severity === "block"),
    flagged: matches.filter((m) => m.severity === "flag"),
  };
}

export const PROHIBITED_CATEGORIES = [
  {
    title: "Weapons & ammunition",
    items: ["Firearms, replicas and parts", "Ammunition and explosives", "Tasers, stun guns, pepper spray", "Knives and bladed weapons beyond kitchen use"],
  },
  {
    title: "Drugs & controlled substances",
    items: ["Narcotics and psychotropic substances", "Prescription-only medicines without a valid prescription", "Tramadol, codeine syrups", "Drug paraphernalia, e-cigarettes and vapes"],
  },
  {
    title: "Counterfeit & stolen goods",
    items: ["Replica or fake designer goods", "Pirated software, cracked licences", "Fake documents or IDs", "Stolen goods or accounts"],
  },
  {
    title: "Gambling & speculative finance",
    items: ["Betting and casino deposits", "Lottery tickets", "Unregulated crypto investment schemes", "Gift cards for resale"],
  },
  {
    title: "Adult content",
    items: ["Pornographic material or subscriptions", "Escort or adult services"],
  },
  {
    title: "Hazardous materials",
    items: ["Flammable liquids and aerosols", "Fireworks", "Loose lithium batteries", "Toxic or corrosive chemicals"],
  },
  {
    title: "Banned by Nigerian Customs",
    items: ["Frozen poultry, pork and beef", "Used (second-hand) clothing", "Spaghetti/noodles, fruit juice in retail packs", "Mosquito repellent coils, soaps & detergents in retail packs (import prohibition list)"],
  },
  {
    title: "Vendor terms & sanctions",
    items: ["Anything that violates the vendor's terms of service", "Purchases for sanctioned persons or countries", "Account sharing or reselling where prohibited", "Fraudulent chargebacks or identity misuse"],
  },
];
