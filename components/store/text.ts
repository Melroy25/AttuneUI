// /demo-only page text. Kannada was machine-authored: have a native speaker review it.
import type { Locale } from "@/lib/attune-ui/preferences/rules";

export const PAGES = ["orders", "products", "returns", "reports", "help"] as const;
export type Page = (typeof PAGES)[number];

const en = {
  products: "Products", returns: "Returns", searchProducts: "Search products", all: "All",
  electronics: "Electronics", home: "Home", fashion: "Fashion",
  inStock: "In stock", lowStock: "Few left", outOfStock: "Out of stock",
  addToCart: "Add to cart", notify: "Notify me", cart: "Cart", quantity: "Quantity",
  selectProduct: "Select a product to see details", noProducts: "No matching products",
  approve: "Approve", reject: "Reject", approved: "Approved", rejected: "Rejected",
  noReturns: "No refund requests left", undoAction: "Undo",
  totalOrders: "Orders", totalValue: "Order value", delayedOrders: "Delayed",
  byStatus: "Orders by status", byRegion: "Orders by region", byPayment: "Orders by payment",
  faq: "Common questions", contactTitle: "Write to support", message: "Your message",
  send: "Send", sent: "Message noted (demo only, nothing is sent)",
};
export type PageText = typeof en;

const kn: PageText = {
  products: "ಉತ್ಪನ್ನಗಳು", returns: "ಹಿಂತಿರುಗಿಸುವಿಕೆ", searchProducts: "ಉತ್ಪನ್ನಗಳನ್ನು ಹುಡುಕಿ", all: "ಎಲ್ಲಾ",
  electronics: "ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್", home: "ಮನೆ", fashion: "ಫ್ಯಾಷನ್",
  inStock: "ಲಭ್ಯವಿದೆ", lowStock: "ಕೆಲವೇ ಉಳಿದಿವೆ", outOfStock: "ಲಭ್ಯವಿಲ್ಲ",
  addToCart: "ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ", notify: "ನನಗೆ ತಿಳಿಸಿ", cart: "ಕಾರ್ಟ್", quantity: "ಪ್ರಮಾಣ",
  selectProduct: "ವಿವರ ನೋಡಲು ಉತ್ಪನ್ನ ಆಯ್ಕೆಮಾಡಿ", noProducts: "ಯಾವುದೇ ಉತ್ಪನ್ನ ಸಿಗಲಿಲ್ಲ",
  approve: "ಅನುಮೋದಿಸಿ", reject: "ತಿರಸ್ಕರಿಸಿ", approved: "ಅನುಮೋದಿಸಲಾಗಿದೆ", rejected: "ತಿರಸ್ಕರಿಸಲಾಗಿದೆ",
  noReturns: "ಮರುಪಾವತಿ ಕೋರಿಕೆಗಳು ಉಳಿದಿಲ್ಲ", undoAction: "ರದ್ದುಗೊಳಿಸಿ",
  totalOrders: "ಆರ್ಡರ್‌ಗಳು", totalValue: "ಆರ್ಡರ್ ಮೌಲ್ಯ", delayedOrders: "ವಿಳಂಬ",
  byStatus: "ಸ್ಥಿತಿ ಪ್ರಕಾರ", byRegion: "ಪ್ರದೇಶ ಪ್ರಕಾರ", byPayment: "ಪಾವತಿ ಪ್ರಕಾರ",
  faq: "ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳು", contactTitle: "ಬೆಂಬಲಕ್ಕೆ ಬರೆಯಿರಿ", message: "ನಿಮ್ಮ ಸಂದೇಶ",
  send: "ಕಳುಹಿಸಿ", sent: "ಸಂದೇಶ ದಾಖಲಾಗಿದೆ (ಡೆಮೊ ಮಾತ್ರ, ಏನನ್ನೂ ಕಳುಹಿಸುವುದಿಲ್ಲ)",
};

export const PAGE_TEXT: Record<Locale, PageText> = { en, kn };
