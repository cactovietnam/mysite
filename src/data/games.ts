export type Game = {
  slug: string;
  title: string;
  engine: "Ren'Py" | "RPGM" | "Unity" | "Unreal";
  version: string;
  sizeGB: number;
  cover: string;
  tags: string[];
  description: string;
  updatedAt: string;
  links: { label: string; url: string }[];
};

// Thêm game mới: copy 1 khối bên dưới, đổi slug/title/cover...
export const games: Game[] = [
  {
    slug: "game-mau-1",
    title: "Game Mẫu Một",
    engine: "Ren'Py",
    version: "1.0.0",
    sizeGB: 3.8,
    cover: "/covers/1.svg",
    tags: ["Visual Novel", "Fantasy"],
    description: "Mô tả ngắn về game. Thay nội dung này bằng giới thiệu thật, 2-4 câu là đủ.",
    updatedAt: "2026-10-12",
    links: [{ label: "Hướng dẫn cài đặt", url: "https://example.com" }],
  },
  {
    slug: "game-mau-2",
    title: "Game Mẫu Hai",
    engine: "RPGM",
    version: "0.9.2",
    sizeGB: 1.2,
    cover: "/covers/2.svg",
    tags: ["RPG", "Phiêu lưu"],
    description: "Một game RPG mẫu để thử bố cục lưới và trang chi tiết.",
    updatedAt: "2026-10-05",
    links: [{ label: "Hướng dẫn cài đặt", url: "https://example.com" }],
  },
  {
    slug: "game-mau-3",
    title: "Game Mẫu Ba",
    engine: "Unity",
    version: "2.1.0",
    sizeGB: 5.4,
    cover: "/covers/3.svg",
    tags: ["Hành động", "3D"],
    description: "Game Unity mẫu, dùng để kiểm tra tìm kiếm theo engine và tag.",
    updatedAt: "2026-09-28",
    links: [{ label: "Hướng dẫn cài đặt", url: "https://example.com" }],
  },
];
