import type { Instrumentation } from "next";

// Next.js (>=15) gọi hàm này cho MỌI lỗi phía server: route handler, server component, server action, middleware.
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return; // notify.ts dùng node:crypto
  const { reportError } = await import("./lib/notify");
  await reportError(err, { source: "server", path: request.path, method: request.method });
};
