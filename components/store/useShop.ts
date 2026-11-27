"use client";

import { useState } from "react";
import { withQuantity, type Cart, type Category, type Preset } from "@/lib/demo/catalog";

/** Demo shopping state, held above the portal so it survives adaptations. Nothing is saved. */
export function useShop() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [selected, setSelected] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [placed, setPlaced] = useState(false);
  const [preset, setPreset] = useState<Preset>("");
  const [location, setLocation] = useState(0); // index into LOCATIONS
  return {
    query, setQuery, category, setCategory, selected, setSelected, cart, placed, preset, setPreset, location, setLocation,
    setQuantity: (id: string, quantity: number) => {
      setPlaced(false);
      setCart((c) => withQuantity(c, id, quantity));
    },
    placeOrder: () => { setCart({}); setPlaced(true); },
  };
}

export type Shop = ReturnType<typeof useShop>;
