// Chạy rất sớm, trước khi trình duyệt khôi phục vị trí cuộn.
// Khi người dùng bấm "tải lại": về đầu trang, bỏ ?engine=... và #hash, như lúc mới vào web.
// Quay lại (Back/Forward) thì giữ nguyên hành vi mặc định.
const code = `(function(){try{
var n=performance.getEntriesByType("navigation")[0];
if(!n||n.type!=="reload")return;
history.scrollRestoration="manual";
if(location.search||location.hash)history.replaceState(null,"",location.pathname);
window.scrollTo(0,0);
window.addEventListener("load",function(){history.scrollRestoration="auto"});
}catch(e){}})();`;

export default function ReloadReset() {
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
