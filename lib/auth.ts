/**
 * 간단한 비밀번호 게이트.
 *  - 비밀번호는 SITE_PASSWORD 환경변수로 바꿀 수 있고, 없으면 기본값 "1500".
 *  - 인증 성공 시 쿠키에 AUTH_TOKEN(비밀번호 자체가 아닌 토큰)을 저장하고,
 *    미들웨어가 그 토큰을 확인한다.
 *  ※ 강력한 보안이 아니라 외부인의 단순 접근을 막는 가벼운 잠금이다.
 */
export const AUTH_COOKIE = "cowave_auth";
export const AUTH_TOKEN = "cw-ok-3f7a9c21e5";

export function expectedPassword(): string {
  return process.env.SITE_PASSWORD?.trim() || "1500";
}
