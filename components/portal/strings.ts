// Kannada strings were machine-authored: have a native speaker review them before the demo.
import type { Locale } from "@/lib/attune-ui/preferences/rules";
import type { Task } from "@/lib/study/tasks";

const en = {
  title: "Order & Support Ops", orders: "Orders", reports: "Reports", help: "Help",
  search: "Search order ID or customer", photoSearch: "Search by product photo",
  photoNote: "Sample catalogue picker (no image recognition)",
  status: "Status", priority: "Priority", region: "Region", courier: "Courier",
  payment: "Payment", any: "Any", more: "More filters", clear: "Clear filters",
  presetRefunds: "High-priority refunds", presetDelayed: "High-priority delays",
  quick: "Quick actions", findDelayed: "Delayed orders", filterRefunds: "Priority refunds",
  refund: "Refund", openOrder: "Open", customer: "Customer", amount: "Amount",
  noOrders: "No matching orders", selectOrder: "Select an order to see details",
  moreActions: "More actions", printSlip: "Print slip", contact: "Contact customer",
  refundAmount: "Refund amount (₹)", confirm: "Confirm refund", cancel: "Cancel",
  refunded: "Refund recorded", invalidAmount: "Enter an amount up to the order total",
  policy: "Refund policy", delayed: "Delayed", refund_requested: "Refund requested",
  shipped: "Shipped", delivered: "Delivered", high: "High", normal: "Normal", low: "Low",
  adapted: "Adapted for faster access", undo: "Undo", pin: "Pin layout", unpin: "Unpin",
  hintFind: "Hint: type the order ID in search, then press Open.",
  hintFindArrow: "Hint: type the order ID in search, then press the arrow ›.",
  hintFilter: "Hint: set both Status and Priority.",
  hintRefund: "Hint: open the order, then use the ⋯ menu to refund.",
};
export type Strings = typeof en;

const kn: Strings = {
  title: "ಆರ್ಡರ್ ಮತ್ತು ಬೆಂಬಲ", orders: "ಆರ್ಡರ್‌ಗಳು", reports: "ವರದಿಗಳು", help: "ಸಹಾಯ",
  search: "ಆರ್ಡರ್ ಐಡಿ ಅಥವಾ ಗ್ರಾಹಕರನ್ನು ಹುಡುಕಿ", photoSearch: "ಉತ್ಪನ್ನದ ಚಿತ್ರದಿಂದ ಹುಡುಕಿ",
  photoNote: "ಮಾದರಿ ಪಟ್ಟಿಯಿಂದ ಆಯ್ಕೆ (ಚಿತ್ರ ಗುರುತಿಸುವಿಕೆ ಇಲ್ಲ)",
  status: "ಸ್ಥಿತಿ", priority: "ಆದ್ಯತೆ", region: "ಪ್ರದೇಶ", courier: "ಕೊರಿಯರ್",
  payment: "ಪಾವತಿ", any: "ಎಲ್ಲಾ", more: "ಇನ್ನಷ್ಟು ಫಿಲ್ಟರ್‌ಗಳು", clear: "ಫಿಲ್ಟರ್ ತೆರವುಗೊಳಿಸಿ",
  presetRefunds: "ತುರ್ತು ಮರುಪಾವತಿಗಳು", presetDelayed: "ತುರ್ತು ವಿಳಂಬಗಳು",
  quick: "ತ್ವರಿತ ಕ್ರಿಯೆಗಳು", findDelayed: "ವಿಳಂಬವಾದ ಆರ್ಡರ್‌ಗಳು", filterRefunds: "ಆದ್ಯತೆಯ ಮರುಪಾವತಿ",
  refund: "ಮರುಪಾವತಿ", openOrder: "ತೆರೆಯಿರಿ", customer: "ಗ್ರಾಹಕ", amount: "ಮೊತ್ತ",
  noOrders: "ಯಾವುದೇ ಆರ್ಡರ್ ಸಿಗಲಿಲ್ಲ", selectOrder: "ವಿವರ ನೋಡಲು ಆರ್ಡರ್ ಆಯ್ಕೆಮಾಡಿ",
  moreActions: "ಇನ್ನಷ್ಟು ಕ್ರಿಯೆಗಳು", printSlip: "ರಸೀದಿ ಮುದ್ರಿಸಿ", contact: "ಗ್ರಾಹಕರನ್ನು ಸಂಪರ್ಕಿಸಿ",
  refundAmount: "ಮರುಪಾವತಿ ಮೊತ್ತ (₹)", confirm: "ಮರುಪಾವತಿ ದೃಢೀಕರಿಸಿ", cancel: "ರದ್ದುಮಾಡಿ",
  refunded: "ಮರುಪಾವತಿ ದಾಖಲಾಗಿದೆ", invalidAmount: "ಆರ್ಡರ್ ಮೊತ್ತದೊಳಗಿನ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ",
  policy: "ಮರುಪಾವತಿ ನೀತಿ", delayed: "ವಿಳಂಬ", refund_requested: "ಮರುಪಾವತಿ ಕೋರಿಕೆ",
  shipped: "ರವಾನಿಸಲಾಗಿದೆ", delivered: "ತಲುಪಿಸಲಾಗಿದೆ", high: "ಹೆಚ್ಚು", normal: "ಸಾಮಾನ್ಯ", low: "ಕಡಿಮೆ",
  adapted: "ವೇಗದ ಬಳಕೆಗಾಗಿ ಹೊಂದಿಸಲಾಗಿದೆ", undo: "ರದ್ದುಗೊಳಿಸಿ", pin: "ವಿನ್ಯಾಸ ಉಳಿಸಿ", unpin: "ಬಿಡುಗಡೆ",
  hintFind: "ಸುಳಿವು: ಆರ್ಡರ್ ಐಡಿ ಹುಡುಕಿ, ನಂತರ ತೆರೆಯಿರಿ ಒತ್ತಿ.",
  hintFindArrow: "ಸುಳಿವು: ಆರ್ಡರ್ ಐಡಿ ಹುಡುಕಿ, ನಂತರ ಬಾಣ › ಒತ್ತಿ.",
  hintFilter: "ಸುಳಿವು: ಸ್ಥಿತಿ ಮತ್ತು ಆದ್ಯತೆ ಎರಡನ್ನೂ ಆಯ್ಕೆಮಾಡಿ.",
  hintRefund: "ಸುಳಿವು: ಆರ್ಡರ್ ತೆರೆದು, ⋯ ಮೆನುವಿನಿಂದ ಮರುಪಾವತಿ ಮಾಡಿ.",
};

export const STRINGS: Record<Locale, Strings> = { en, kn };

export const POLICY: Record<Locale, { heading: string; points: string[] }[]> = {
  en: [
    { heading: "Eligibility", points: ["Refunds are allowed within 7 days of delivery.", "Delayed orders qualify before delivery."] },
    { heading: "Partial refunds", points: ["Use a partial refund for one damaged item.", "The amount cannot exceed the order total."] },
    { heading: "Timelines", points: ["UPI refunds take 1 to 2 working days.", "Card refunds take 5 to 7 working days."] },
  ],
  kn: [
    { heading: "ಅರ್ಹತೆ", points: ["ತಲುಪಿದ 7 ದಿನಗಳೊಳಗೆ ಮರುಪಾವತಿ ಸಾಧ್ಯ.", "ವಿಳಂಬವಾದ ಆರ್ಡರ್‌ಗಳು ತಲುಪುವ ಮೊದಲೇ ಅರ್ಹ."] },
    { heading: "ಭಾಗಶಃ ಮರುಪಾವತಿ", points: ["ಒಂದು ವಸ್ತು ಹಾನಿಯಾಗಿದ್ದರೆ ಭಾಗಶಃ ಮರುಪಾವತಿ ಬಳಸಿ.", "ಮೊತ್ತವು ಆರ್ಡರ್ ಮೊತ್ತವನ್ನು ಮೀರಬಾರದು."] },
    { heading: "ಸಮಯ", points: ["UPI ಮರುಪಾವತಿಗೆ 1 ರಿಂದ 2 ಕೆಲಸದ ದಿನಗಳು.", "ಕಾರ್ಡ್ ಮರುಪಾವತಿಗೆ 5 ರಿಂದ 7 ಕೆಲಸದ ದಿನಗಳು."] },
  ],
};

export function taskText(task: Task, locale: Locale): string {
  const s = STRINGS[locale];
  if (task.id === "findDelayed") {
    return locale === "kn" ? `ವಿಳಂಬವಾದ ಆರ್ಡರ್ ${task.orderId} ತೆರೆಯಿರಿ` : `Find and open delayed order #${task.orderId}`;
  }
  if (task.id === "filterRefunds") {
    const pair = `${s.status} = ${s[task.status]}, ${s.priority} = ${s[task.priority]}`;
    return locale === "kn" ? `ಫಿಲ್ಟರ್ ಮಾಡಿ: ${pair}` : `Filter: ${pair}`;
  }
  return locale === "kn"
    ? `${task.orderId} ಗೆ ₹${task.amount} ಭಾಗಶಃ ಮರುಪಾವತಿ ಮಾಡಿ`
    : `Refund ₹${task.amount} (partial) on ${task.orderId}`;
}
