"use client";
import { useEffect } from "react";
import { useAuthUser } from "@/lib/auth-store";
import { setFavUser, syncFavs } from "@/lib/user-lists";

// Không hiện gì: khi có người đăng nhập thì gộp yêu thích với tài khoản, và các lần bấm tim sau đó ghi lên máy chủ.
export default function FavSync() {
  const id = useAuthUser()?.id ?? null;
  useEffect(() => {
    setFavUser(id);
    if (id) void syncFavs();
  }, [id]);
  return null;
}
