import { ExternalLink } from "lucide-react";
import { EXTERNAL_LINKS } from "@/lib/nav";

/**
 * 에누리 관리자 사이트 바로가기. 앱 내부 페이지가 아니라 완전히 다른
 * 사이트로 나가므로 NAV_ITEMS(사이드바 메뉴탭)엔 안 넣고 별도 섹션으로 뺐다.
 * target="_blank" 로 새 탭에 열어 현재 화면(필터·스크롤 등)을 잃지 않게 한다.
 */
export function ExternalLinks() {
  return (
    <div className="space-y-0.5 border-t p-3">
      {EXTERNAL_LINKS.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800"
        >
          <ExternalLink size={13} className="shrink-0" />
          <span className="truncate">{link.label}</span>
        </a>
      ))}
    </div>
  );
}
