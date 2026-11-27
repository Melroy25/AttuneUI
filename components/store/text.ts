// /demo-only page text. Kannada was machine-authored: have a native speaker review it.
import type { Locale } from "@/lib/attune-ui/preferences/rules";

export const PAGES = ["home", "orders", "products", "returns", "reports", "help", "cart"] as const;
export type Page = (typeof PAGES)[number];

const en = {
  home: "Home", products: "Products", returns: "Returns", cart: "Cart",
  searchProducts: "Search for products, brands and more", search: "Search",
  deliverTo: "Deliver to: Bengaluru 560001", guest: "Guest", support: "Support", forYou: "For You",
  fashion: "Fashion", mobiles: "Mobiles", electronics: "Electronics", beauty: "Beauty",
  appliances: "Appliances", toys: "Toys", grocery: "Grocery", sports: "Sports", books: "Books",
  furniture: "Furniture", homeCategory: "Home items",
  sale: "Big Weekend Sale", banner1: "Laptops and audio", banner1Note: "Up to 45% off",
  banner2: "Fashion picks", banner2Note: "From ₹299", banner3: "Home refresh", banner3Note: "Up to 70% off",
  shopNow: "Shop now", previous: "Previous", nextItems: "Next",
  stillLooking: "Still looking for these?", topDeals: "Top deals", homePicks: "For your home",
  inStock: "In stock", lowStock: "Few left", outOfStock: "Out of stock",
  addToCart: "Add to cart", notify: "Notify me", quantity: "Quantity", remove: "Remove",
  underFive: "Under ₹500", halfOff: "50% off or more", moreOffers: "More offers", moreCharts: "More charts",
  quickAdd: "+ Add",
  hintHome: "Tip: tap a product to see it, or pick a category above.",
  hintProducts: "Tip: tap › on a product, then Add to cart.",
  hintOrders: "Tip: tap › to open an order. Use the filters to narrow the list.",
  hintReturns: "Tip: press Approve or Reject. You can undo it.",
  hintReports: "Tip: these figures are for viewing only.",
  hintHelp: "Tip: open Refund policy to read the rules.",
  hintCart: "Tip: check the quantities, then Place order.",
  total: "Total", placeOrder: "Place order", emptyCart: "Your cart is empty",
  orderPlaced: "Order placed (demo only: no payment is taken and nothing is shipped)",
  selectProduct: "Select a product to see details", noProducts: "No matching products",
  approve: "Approve", reject: "Reject", approved: "Approved", rejected: "Rejected",
  noReturns: "No refund requests left", undoAction: "Undo",
  totalOrders: "Orders", totalValue: "Order value", delayedOrders: "Delayed",
  byStatus: "Orders by status", byRegion: "Orders by region", byPayment: "Orders by payment",
  faq: "Common questions", contactTitle: "Write to support", message: "Your message",
  send: "Send", sent: "Message noted (demo only, nothing is sent)",
  wishlist: "Wishlist", similarTo: "Search similar to", customerSupport: "Customer Support", hideShortcut: "Hide shortcut",
  hardToRead: "Feeling hard to read?", comfortYes: "Yes, make the text larger", comfortNo: "No, keep the text",
};
export type PageText = typeof en;

const kn: PageText = {
  home: "ಮುಖಪುಟ", products: "ಉತ್ಪನ್ನಗಳು", returns: "ಹಿಂತಿರುಗಿಸುವಿಕೆ", cart: "ಕಾರ್ಟ್",
  searchProducts: "ಉತ್ಪನ್ನಗಳು, ಬ್ರ್ಯಾಂಡ್‌ಗಳನ್ನು ಹುಡುಕಿ", search: "ಹುಡುಕಿ",
  deliverTo: "ವಿತರಣೆ: ಬೆಂಗಳೂರು 560001", guest: "ಅತಿಥಿ", support: "ಬೆಂಬಲ", forYou: "ನಿಮಗಾಗಿ",
  fashion: "ಫ್ಯಾಷನ್", mobiles: "ಮೊಬೈಲ್‌ಗಳು", electronics: "ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್", beauty: "ಸೌಂದರ್ಯ",
  appliances: "ಉಪಕರಣಗಳು", toys: "ಆಟಿಕೆಗಳು", grocery: "ದಿನಸಿ", sports: "ಕ್ರೀಡೆ", books: "ಪುಸ್ತಕಗಳು",
  furniture: "ಪೀಠೋಪಕರಣ", homeCategory: "ಮನೆ ವಸ್ತುಗಳು",
  sale: "ವಾರಾಂತ್ಯದ ದೊಡ್ಡ ಮಾರಾಟ", banner1: "ಲ್ಯಾಪ್‌ಟಾಪ್ ಮತ್ತು ಆಡಿಯೋ", banner1Note: "45% ವರೆಗೆ ರಿಯಾಯಿತಿ",
  banner2: "ಫ್ಯಾಷನ್ ಆಯ್ಕೆ", banner2Note: "₹299 ರಿಂದ", banner3: "ಮನೆಗೆ ಹೊಸತನ", banner3Note: "70% ವರೆಗೆ ರಿಯಾಯಿತಿ",
  shopNow: "ಈಗ ಖರೀದಿಸಿ", previous: "ಹಿಂದೆ", nextItems: "ಮುಂದೆ",
  stillLooking: "ಇನ್ನೂ ಇವುಗಳನ್ನು ಹುಡುಕುತ್ತಿದ್ದೀರಾ?", topDeals: "ಉತ್ತಮ ಕೊಡುಗೆಗಳು", homePicks: "ನಿಮ್ಮ ಮನೆಗಾಗಿ",
  inStock: "ಲಭ್ಯವಿದೆ", lowStock: "ಕೆಲವೇ ಉಳಿದಿವೆ", outOfStock: "ಲಭ್ಯವಿಲ್ಲ",
  addToCart: "ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ", notify: "ನನಗೆ ತಿಳಿಸಿ", quantity: "ಪ್ರಮಾಣ", remove: "ತೆಗೆದುಹಾಕಿ",
  underFive: "₹500 ಒಳಗೆ", halfOff: "50% ಅಥವಾ ಹೆಚ್ಚು ರಿಯಾಯಿತಿ", moreOffers: "ಇನ್ನಷ್ಟು ಕೊಡುಗೆಗಳು", moreCharts: "ಇನ್ನಷ್ಟು ಚಾರ್ಟ್‌ಗಳು",
  quickAdd: "+ ಸೇರಿಸಿ",
  hintHome: "ಸುಳಿವು: ಉತ್ಪನ್ನ ಒತ್ತಿ, ಅಥವಾ ಮೇಲಿನ ವಿಭಾಗ ಆಯ್ಕೆಮಾಡಿ.",
  hintProducts: "ಸುಳಿವು: ಉತ್ಪನ್ನದ › ಒತ್ತಿ, ನಂತರ ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ.",
  hintOrders: "ಸುಳಿವು: ಆರ್ಡರ್ ತೆರೆಯಲು › ಒತ್ತಿ. ಪಟ್ಟಿ ಚಿಕ್ಕದಾಗಿಸಲು ಫಿಲ್ಟರ್ ಬಳಸಿ.",
  hintReturns: "ಸುಳಿವು: ಅನುಮೋದಿಸಿ ಅಥವಾ ತಿರಸ್ಕರಿಸಿ ಒತ್ತಿ. ರದ್ದುಗೊಳಿಸಬಹುದು.",
  hintReports: "ಸುಳಿವು: ಈ ಅಂಕಿಗಳು ನೋಡಲು ಮಾತ್ರ.",
  hintHelp: "ಸುಳಿವು: ನಿಯಮ ಓದಲು ಮರುಪಾವತಿ ನೀತಿ ತೆರೆಯಿರಿ.",
  hintCart: "ಸುಳಿವು: ಪ್ರಮಾಣ ಪರಿಶೀಲಿಸಿ, ನಂತರ ಆರ್ಡರ್ ಮಾಡಿ.",
  total: "ಒಟ್ಟು", placeOrder: "ಆರ್ಡರ್ ಮಾಡಿ", emptyCart: "ನಿಮ್ಮ ಕಾರ್ಟ್ ಖಾಲಿಯಾಗಿದೆ",
  orderPlaced: "ಆರ್ಡರ್ ದಾಖಲಾಗಿದೆ (ಡೆಮೊ ಮಾತ್ರ: ಪಾವತಿ ಇಲ್ಲ, ಏನನ್ನೂ ಕಳುಹಿಸುವುದಿಲ್ಲ)",
  selectProduct: "ವಿವರ ನೋಡಲು ಉತ್ಪನ್ನ ಆಯ್ಕೆಮಾಡಿ", noProducts: "ಯಾವುದೇ ಉತ್ಪನ್ನ ಸಿಗಲಿಲ್ಲ",
  approve: "ಅನುಮೋದಿಸಿ", reject: "ತಿರಸ್ಕರಿಸಿ", approved: "ಅನುಮೋದಿಸಲಾಗಿದೆ", rejected: "ತಿರಸ್ಕರಿಸಲಾಗಿದೆ",
  noReturns: "ಮರುಪಾವತಿ ಕೋರಿಕೆಗಳು ಉಳಿದಿಲ್ಲ", undoAction: "ರದ್ದುಗೊಳಿಸಿ",
  totalOrders: "ಆರ್ಡರ್‌ಗಳು", totalValue: "ಆರ್ಡರ್ ಮೌಲ್ಯ", delayedOrders: "ವಿಳಂಬ",
  byStatus: "ಸ್ಥಿತಿ ಪ್ರಕಾರ", byRegion: "ಪ್ರದೇಶ ಪ್ರಕಾರ", byPayment: "ಪಾವತಿ ಪ್ರಕಾರ",
  faq: "ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳು", contactTitle: "ಬೆಂಬಲಕ್ಕೆ ಬರೆಯಿರಿ", message: "ನಿಮ್ಮ ಸಂದೇಶ",
  send: "ಕಳುಹಿಸಿ", sent: "ಸಂದೇಶ ದಾಖಲಾಗಿದೆ (ಡೆಮೊ ಮಾತ್ರ, ಏನನ್ನೂ ಕಳುಹಿಸುವುದಿಲ್ಲ)",
  wishlist: "ಇಚ್ಛಾಪಟ್ಟಿ", similarTo: "ಇದರಂತಹವು ಹುಡುಕಿ", customerSupport: "ಗ್ರಾಹಕ ಬೆಂಬಲ", hideShortcut: "ಶಾರ್ಟ್‌ಕಟ್ ಮರೆಮಾಡಿ",
  hardToRead: "ಓದಲು ಕಷ್ಟವಾಗುತ್ತಿದೆಯೇ?", comfortYes: "ಹೌದು, ಅಕ್ಷರ ದೊಡ್ಡದು ಮಾಡಿ", comfortNo: "ಬೇಡ, ಹೀಗೇ ಇರಲಿ",
};

export const PAGE_TEXT: Record<Locale, PageText> = { en, kn };

/** "home" is both a page and a category, so the category uses its own label. */
export const categoryLabel = (t: PageText, category: string) =>
  category === "home" ? t.homeCategory : (t as Record<string, string>)[category];
