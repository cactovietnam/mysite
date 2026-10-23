import raw from "./site.json";

export type DonateConfig = {
  enabled: boolean;
  title: string;
  subtitle: string;
  cardTitle: string;
  qrImage: string;
  qrNote: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  transferContent: string;
};

// Đọc trực tiếp site.json, ép kiểu lỏng để thiếu khóa `donate` vẫn build được.
const root = raw as unknown as Record<string, unknown>;
const d = (root.donate ?? {}) as Record<string, unknown>;
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v.trim() : fallback);

export const donateConfig: DonateConfig = {
  enabled: d.enabled !== false,
  title: str(d.title) || "DONATE",
  subtitle: str(d.subtitle, "Cùng tiếp sức cho những bản Việt hóa mới."),
  cardTitle: str(d.cardTitle) || `Ủng hộ ${str(root.name, "website")}`,
  qrImage: str(d.qrImage, "/donate-qr.png"),
  qrNote: str(d.qrNote, "Quét mã QR bằng ứng dụng ngân hàng để ủng hộ."),
  bankName: str(d.bankName),
  accountNumber: str(d.accountNumber),
  accountHolder: str(d.accountHolder),
  transferContent: str(d.transferContent),
};

// Chữ trên menu/footer: nav.donate trong site.json (thiếu thì dùng "DONATE").
const nav = (root.nav ?? {}) as Record<string, unknown>;
export const donateNavLabel = str(nav.donate) || "DONATE";
