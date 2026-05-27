import type { Site, SiteId } from "./types";

export const SITES: Site[] = [
  { id: "enuri", name: "에누리", color: "#ff6b35" },
];

export const SITE_BY_ID = new Map(SITES.map((s) => [s.id, s]));

export function getSite(id: SiteId): Site | undefined {
  return SITE_BY_ID.get(id);
}

export function getSiteName(id: SiteId): string {
  return SITE_BY_ID.get(id)?.name ?? id;
}
