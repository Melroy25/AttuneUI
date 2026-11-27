export const ARM_IDS = ["baseline", "ergonomic", "disclosure", "shortcut", "guided"] as const;
export type ArmId = (typeof ARM_IDS)[number];

export type Modality = "coarse" | "fine";
export type PointerKind = "mouse" | "touch" | "pen";

export type InteractionEvent =
  | {
      type: "down";
      t: number;
      x: number;
      y: number;
      targetId: string | null; // nearest data-attune-id, if any
      interactive: boolean;
      nearTargetPx: number | null; // distance to closest interactive target
    }
  | { type: "move"; t: number; x: number; y: number }
  | { type: "hover"; t: number; targetId: string; durationMs: number }
  | { type: "scroll"; t: number; y: number }
  | { type: "view"; t: number; view: string };

export interface FrictionSummary {
  rage: number;
  dead: number;
  miss: number;
  dwell: number;
  thrash: number;
  backtrack: number;
  tortuosity: number; // 1 = straight line; 1 for touch
}
