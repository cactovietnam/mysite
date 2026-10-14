import type { MouseEvent } from "react";

// Phải trùng hằng EVENT trong Library.tsx: báo cho bộ lọc đọc lại URL sau khi ta tự pushState.
const FILTER_EVENT = "filter-change";

// Link nội trang chủ. Next không cuộn lên đầu khi bấm Link tới chính trang đang đứng, và bộ lọc
// (đọc từ URL) cũng không biết URL đã đổi. Nên khi đang ở "/" ta tự xử lý: đổi URL, báo bộ lọc, rồi cuộn.
// Đang ở trang khác thì không làm gì, để Link điều hướng như thường.
export function softNav(e: MouseEvent, pathname: string, search: string, target: "top" | "library") {
  if (pathname !== "/" || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();

  const url = `/${search}${target === "library" ? "#kho-game" : ""}`;
  const { pathname: p, search: s, hash: h } = window.location;
  if (url !== p + s + h) {
    window.history.pushState(null, "", url);
    window.dispatchEvent(new Event(FILTER_EVENT));
  }

  if (target === "top") window.scrollTo({ top: 0, behavior: "smooth" });
  else document.getElementById("kho-game")?.scrollIntoView({ behavior: "smooth" });
}
