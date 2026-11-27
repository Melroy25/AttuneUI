"use client";

import { useCallback, useEffect, useState } from "react";
import { withQuantity, type Cart, type Category, type Preset } from "@/lib/demo/catalog";
import { cityKey, latestInCart, parseCity } from "@/lib/demo/quick";

/** Demo shopping state, held above the portal so it survives adaptations. Only the city is saved. */
export function useShop(user: string | null) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [selected, setSelected] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [placed, setPlaced] = useState(false);
  const [preset, setPreset] = useState<Preset>("");
  const [location, setLocation] = useState(0); // index into LOCATIONS
  const [last, setLast] = useState<string | null>(null);
  const [article, setArticle] = useState<string | null>(null);
  const [resume, setResume] = useState<string | null>(null); // paragraph to return to
  const clearResume = useCallback(() => setResume(null), []);
  useEffect(() => {
    try {
      const city = parseCity(localStorage.getItem(cityKey(user)));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- storage exists only after mount
      if (city !== null) setLocation(city);
    } catch {
      // storage blocked: the default city
    }
  }, [user]);
  const chooseCity = (city: number) => {
    setLocation(city);
    try {
      localStorage.setItem(cityKey(user), String(city));
    } catch {
      // storage full or blocked: it lasts as long as the tab
    }
  };
  return {
    query, setQuery, category, setCategory, selected, setSelected, cart, placed, preset, setPreset, location, setLocation: chooseCity, latest: latestInCart(cart, last),
    article, resume, clearResume,
    openArticle: (id: string | null, paragraph: string | null = null) => { setArticle(id); setResume(paragraph); },
    setQuantity: (id: string, quantity: number) => {
      setPlaced(false);
      if (quantity > (cart[id] ?? 0)) setLast(id);
      setCart((c) => withQuantity(c, id, quantity));
    },
    placeOrder: () => { setCart({}); setPlaced(true); },
  };
}

export type Shop = ReturnType<typeof useShop>;
