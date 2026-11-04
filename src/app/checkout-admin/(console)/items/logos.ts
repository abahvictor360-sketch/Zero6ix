import "server-only";
import type { LogoKey } from "@/lib/payfx/catalog";
import { LOGOS, logoSvg } from "@/lib/payfx/icons";

/** Logo choices for the item form (the internal "test" mark is not offered). */
export const logoChoices = () =>
  (Object.keys(LOGOS) as LogoKey[])
    .filter((k) => k !== "test")
    .map((k) => ({ key: k, title: LOGOS[k].title, svg: logoSvg(k, { size: 28 }) }));
