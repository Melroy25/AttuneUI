import { ImageResponse } from "next/og";

const SIZES = [192, 512];

export const dynamicParams = false;
export const generateStaticParams = () => SIZES.map((size) => ({ size: String(size) }));

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!SIZES.includes(size)) return new Response("not found", { status: 404 });
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex", width: "100%", height: "100%", alignItems: "center",
          justifyContent: "center", background: "#0f172a", color: "#34d399", fontSize: size / 2,
        }}
      >
        A
      </div>
    ),
    { width: size, height: size },
  );
}
