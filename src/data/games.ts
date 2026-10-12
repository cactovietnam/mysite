import data from "./games.json";

export type Game = {
  slug: string;
  title: string;
  engine: "Ren'Py" | "RPGM" | "Unity" | "Unreal";
  version: string;
  sizeGB: number;
  cover: string;
  images: string[]; // ảnh trong thư viện, do quan_ly.py quản lý
  tags: string[];
  description: string;
  updatedAt: string;
  links: { label: string; url: string }[];
};

// Dữ liệu nằm trong games.json (tool quan_ly.py tự sửa file đó).
export const games = data as unknown as Game[];
