/**
 * 주간 매출 보고 — 캐시 없이 빠르게.
 *
 * weekly-report.mts 는 전체 캐시(244개 파일, 약 4분 파싱)에 의존한다.
 * 주간보고에 실제로 필요한 건 보고 기간과 전년 동기에 걸치는 파일뿐이라,
 * 그것만 임시 디렉터리에 심볼릭 링크로 모아 DATA_DIR 로 지정해 실행한다.
 * 라이브러리 코드는 그대로 쓰므로 결과는 전체 파싱과 동일하다.
 *
 * 실행: npx tsx scripts/weekly-report-fast.mts
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  symlinkSync,
  statSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const SRC_DIR = resolve(process.env.DATA_DIR?.trim() || "./data");
const SITE = "에누리";
const SRC = join(SRC_DIR, SITE);
const TMP = resolve("./.report-tmp");
const TMP_SITE = join(TMP, SITE);

if (!existsSync(SRC)) {
  console.error(`데이터 디렉터리를 찾을 수 없습니다: ${SRC}`);
  process.exit(1);
}

const entries = readdirSync(SRC).filter((f) => /\.xlsx?$/i.test(f));

/** 파일명에서 매출 기간을 뽑는다. GMV 원천이 아니면 null. */
function rangeOf(name: string): { start: string; end: string } | null {
  const m = name.match(/GMV_RAWDATA_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})/);
  return m ? { start: m[1], end: m[2] } : null;
}

// 보고 기간: 데이터가 있는 마지막 날이 속한 달의 1일 ~ 그 날
let latest = "";
for (const f of entries) {
  const r = rangeOf(f);
  if (r && r.end > latest) latest = r.end;
}
if (!latest) {
  console.error("GMV 원천 파일을 찾지 못했습니다.");
  process.exit(1);
}

const TO = process.env.REPORT_TO?.trim() || latest;
const FROM = process.env.REPORT_FROM?.trim() || `${TO.slice(0, 7)}-01`;
const lastYear = (d: string) => `${Number(d.slice(0, 4)) - 1}${d.slice(4)}`;
const YOY_FROM = lastYear(FROM);
const YOY_TO = lastYear(TO);

const overlaps = (a1: string, a2: string, b1: string, b2: string) =>
  a1 <= b2 && b1 <= a2;

// 보고 기간 또는 전년 동기에 걸치는 GMV 파일 + 목표(타겟) 파일만 추린다.
const needed = entries.filter((f) => {
  if (/타겟/.test(f)) return true;
  const r = rangeOf(f);
  if (!r) return false;
  return (
    overlaps(r.start, r.end, FROM, TO) ||
    overlaps(r.start, r.end, YOY_FROM, YOY_TO)
  );
});

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP_SITE, { recursive: true });

let bytes = 0;
for (const f of needed) {
  symlinkSync(join(SRC, f), join(TMP_SITE, f));
  bytes += statSync(join(SRC, f)).size;
}

console.error(
  `[fast] ${FROM}~${TO} (전년 ${YOY_FROM}~${YOY_TO}) · ` +
    `${needed.length}/${entries.length}개 파일 · ${(bytes / 1048576).toFixed(0)}MB 파싱`,
);

const res = spawnSync(
  "npx",
  ["tsx", "scripts/weekly-report.mts"],
  {
    stdio: ["ignore", "inherit", "pipe"],
    env: {
      ...process.env,
      DATA_DIR: TMP,
      REPORT_FROM: FROM,
      REPORT_TO: TO,
    },
  },
);

rmSync(TMP, { recursive: true, force: true });
process.exit(res.status ?? 1);
