"use client";
import { useEffect } from "react";
import { markSeen } from "@/lib/user-lists";

// Không hiện gì: chỉ ghi nhận game này đã được mở xem.
export default function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => { markSeen(slug); }, [slug]);
  return null;
}
