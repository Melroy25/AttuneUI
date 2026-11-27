// Which article helps someone looking at a product. Products without a matching one get the hub.
import type { Product } from "./catalog";

export type Topic = "topicSmartwatch" | "topicHeadphone" | "topicSmartphone" | "topicGadget";
export interface Guide { article: string; topic: Topic }

const SMARTPHONE: Guide = { article: "smartphone", topic: "topicSmartphone" };
const AUDIO: Guide = { article: "headphones", topic: "topicHeadphone" };
const BY_ID: Record<string, Guide> = {
  "PRD-102": AUDIO, "PRD-110": AUDIO,
  "PRD-105": { article: "smartwatch", topic: "topicSmartwatch" },
  "PRD-107": SMARTPHONE, "PRD-114": SMARTPHONE, "PRD-115": SMARTPHONE,
};
const GADGETS: Guide = { article: "gadgets", topic: "topicGadget" };

export const guideFor = (p: Product): Guide | null =>
  BY_ID[p.id] ?? (p.category === "home" || p.category === "appliances" ? GADGETS : null);
