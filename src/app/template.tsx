// template (khác layout) được dựng lại mỗi lần đổi trang, nên class anim-page chạy lại và tạo hiệu ứng "vào trang".
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="anim-page">{children}</div>;
}
