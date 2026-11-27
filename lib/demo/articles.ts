// /demo-only articles. Fictional authors, general buying advice, English only.
export interface Paragraph { id: string; text: string; simpleExplanation: string; summary: string; example: string }
export interface Article {
  id: string; title: string; image: string; category: string; author: string; readingTime: number; // minutes
  content: Paragraph[];
}

type Lines = [text: string, simple: string, summary: string, example: string];
const article = (
  id: string, title: string, image: string, category: string, author: string, readingTime: number, lines: Lines[],
): Article => ({
  id, title, image, category, author, readingTime,
  content: lines.map(([text, simpleExplanation, summary, example], i) =>
    ({ id: `${id}-p${i + 1}`, text, simpleExplanation, summary, example })),
});

export const ARTICLES: Article[] = [
  article("smartwatch", "Smartwatch Buying Guide", "⌚", "Electronics", "Asha Rao (demo author)", 3, [
    ["Start with the phone you already own. Many watches pair fully with only one phone system, and a watch that pairs partly may show alerts but block replies, payments or app installs. Check the compatibility list on the product page before you compare anything else.",
      "Make sure the watch works with your phone before looking at other features.",
      "Compatibility comes first.", "A watch may show messages from your phone but not let you answer them."],
    ["Battery life depends on the screen and sensors. An always-on bright screen, continuous heart-rate tracking and satellite positioning each drain power, so the number on the box usually assumes several of them are switched off. Look for the figure that matches how you will actually use it.",
      "The advertised battery time is often measured with features turned off.",
      "More features on means less battery.", "A \"7 day\" watch may last about two days with the screen always on."],
    ["Water resistance ratings describe lab pressure tests, not every activity. A splash-resistant rating covers rain and hand washing, while swimming needs a higher rating. Hot showers, soap and diving add stress that the basic rating does not cover.",
      "Not every water-resistant watch is safe for swimming.",
      "Match the rating to the activity.", "Rain is fine for most watches; a pool needs a swim rating."],
    ["Treat health readings as trends. Wrist sensors can drift with a loose strap, movement or tattoos, and they are not medical instruments. Wear the watch snugly, compare week with week, and ask a doctor about anything that worries you.",
      "The watch gives estimates, not medical results.",
      "Watch the pattern, not one number.", "A resting heart rate that slowly rises over a week says more than one reading."],
  ]),
  article("laptop", "Laptop and Tech Tips", "💻", "Electronics", "Vikram Shetty (demo author)", 3, [
    ["Choose memory for the way you work. Browsing and documents run comfortably on a modest amount, but many open tabs, video calls and editing tools compete for it. Some laptops solder memory to the board, so it cannot be added later.",
      "Memory is the space the laptop uses for things open right now; sometimes you cannot add more later.",
      "Buy enough memory up front.", "Thirty browser tabs plus a video call need more memory than writing one document."],
    ["A solid-state drive changes how fast a laptop feels more than a small processor upgrade does. It starts the system and opens files quickly. Check the capacity too, because the system and updates use part of it before you save anything.",
      "A solid-state drive makes everyday actions fast.",
      "Prefer a solid-state drive with room to spare.", "A 256 GB drive does not give you the full 256 GB for your own files."],
    ["Ports and weight matter every day. List what you plug in, such as a mouse, a display or a memory card, and count whether you will need an adapter. If you carry the laptop daily, include the charger when you judge the weight.",
      "Check that your devices can plug in and that the laptop is comfortable to carry.",
      "Count ports and carried weight.", "A thin laptop with one port may need a dongle for a projector."],
    ["Look after the battery with gentle habits. Heat shortens its life, so keep the vents clear and avoid using the laptop on a bed or cushion. Many laptops offer a setting that stops charging early when they stay plugged in.",
      "Keep the laptop cool and use the battery-protection setting if there is one.",
      "Less heat, longer battery life.", "A pillow under a laptop can block the air vents."],
  ]),
  article("headphones", "Headphone Product Comparison", "🎧", "Audio", "Meera Nair (demo author)", 3, [
    ["Shape decides comfort and isolation. Over-ear models surround the ear and block more noise, on-ear models are lighter but press on it, and in-ear models are small and portable but depend on a good tip seal. Try to match the shape to where you listen longest.",
      "The three shapes feel different and block different amounts of outside sound.",
      "Pick the shape for your longest listening place.", "For long bus rides, a well-sealed model blocks more engine noise."],
    ["Active noise cancelling uses microphones to reduce steady sounds such as engines and fans. It is less effective against sudden voices, and it uses extra battery. Passive isolation from a good seal helps with the sounds that cancelling misses.",
      "Noise cancelling works best on constant humming, less on voices.",
      "It cuts steady noise and costs battery.", "It hushes an aircraft hum better than a nearby conversation."],
    ["Wireless sound depends on both ends. The phone and headphones negotiate a shared codec, so an advanced codec on only one side is not used. For calls, microphone quality matters more than the music codec.",
      "Both devices must support a sound format for it to be used.",
      "Check both phone and headphones.", "A premium codec on headphones does nothing if the phone lacks it."],
    ["Compare battery figures with the same settings. Makers often quote hours with noise cancelling off and moderate volume. Quick-charge claims are useful if you forget to charge, so note how many hours a short charge gives.",
      "Compare battery hours measured the same way.",
      "Check the test conditions.", "\"30 hours\" may become much less with noise cancelling on."],
  ]),
  article("smartphone", "Smartphone Shopping Advice", "📱", "Mobiles", "Rahul Pai (demo author)", 3, [
    ["Software support decides how long a phone stays safe to use. Look for the stated number of years of security and system updates, since an older phone without updates collects unfixed faults. Longer support often matters more than a faster chip.",
      "Updates keep the phone safe; check how many years are promised.",
      "Buy for years of updates.", "Four years of security updates outlast a one-year promise."],
    ["Megapixels alone do not describe a camera. Sensor size, the lens and the processing shape the result, especially at night. Look at sample photos taken in conditions like yours rather than comparing a single number.",
      "A bigger megapixel number does not always mean better photos.",
      "Judge photos, not megapixels.", "A 12 MP phone can take a better night photo than a 108 MP one."],
    ["Screen brightness and refresh rate affect daily comfort. A brighter screen stays readable outdoors, and a higher refresh rate makes scrolling smoother while using more power. Many phones let you switch the rate to save battery.",
      "Bright screens help outdoors; smooth screens use more power.",
      "Balance smoothness with battery.", "Lowering the refresh rate can stretch a low battery through the evening."],
    ["Check the total cost before paying. Some boxes no longer include a charger, and a case or screen guard may be extra. Confirm the return window and where the nearest service centre is.",
      "Add accessories and service to the price you compare.",
      "Look beyond the sticker price.", "A cheaper phone plus a charger may cost as much as a dearer one."],
  ]),
  article("gadgets", "Home Gadget Guide", "💡", "Home", "Divya Kamath (demo author)", 3, [
    ["Start with a problem you want solved. A gadget that removes a daily chore gets used, while one bought for novelty often ends up in a drawer. Write down the task and how often it happens before browsing.",
      "Buy things that fix a real daily task.",
      "Need first, features second.", "A kettle used each morning earns its place more than a rarely used gadget."],
    ["Power rating affects both speed and bills. A higher wattage heats faster, but older wiring and shared sockets have limits. Avoid running several heating appliances from one extension board.",
      "Powerful appliances are quicker but need safe wiring.",
      "Respect socket limits.", "A kettle and a heater on one extension board can overload it."],
    ["Smart gadgets need a network and an account. Check what still works if the internet is down, which permissions the app asks for, and whether the maker still updates it. A simple switch can be the more reliable choice.",
      "Connected devices depend on the internet and the maker's app.",
      "Know what works offline.", "A smart bulb should still turn on from the wall switch."],
    ["Think about cleaning and spare parts. Removable, washable parts keep appliances usable, and filters or blades should be easy to buy. A short note of the model number helps when you need service.",
      "Easy cleaning and available parts make gadgets last.",
      "Check upkeep before buying.", "A mixer with replaceable jars is not scrapped when one jar cracks."],
  ]),
];
