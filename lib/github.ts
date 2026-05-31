/**
 * GitHub Contents API 로 파일을 커밋한다. (data/에누리 폴더에 xls 업로드용)
 *
 * 환경변수:
 *   GITHUB_TOKEN   — fine-grained PAT, cowave 저장소 Contents:Write 권한 필요
 *   GITHUB_OWNER   — 기본값 may1018-git
 *   GITHUB_REPO    — 기본값 cowave
 *   GITHUB_BRANCH  — 기본값 claude/hopeful-curie-n7gjB (Vercel 배포 브랜치)
 */
const GITHUB_API = "https://api.github.com";

function repoConfig() {
  const owner = process.env.GITHUB_OWNER || "may1018-git";
  const repo = process.env.GITHUB_REPO || "cowave";
  const branch = process.env.GITHUB_BRANCH || "claude/hopeful-curie-n7gjB";
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN 환경변수가 설정되지 않았습니다.");
  return { owner, repo, branch, token };
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function getExistingSha(path: string): Promise<string | null> {
  const { owner, repo, branch, token } = repoConfig();
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub get contents 실패: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { sha?: string };
  return data.sha ?? null;
}

export interface CommitResult {
  commitSha: string;
  htmlUrl: string;
  overwrote: boolean;
}

export async function commitFileToGitHub(opts: {
  path: string;
  content: Buffer;
  message: string;
}): Promise<CommitResult> {
  const { owner, repo, branch, token } = repoConfig();
  const sha = await getExistingSha(opts.path);
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodePath(opts.path)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: opts.message,
      content: opts.content.toString("base64"),
      branch,
      sha: sha ?? undefined,
    }),
  });
  if (!res.ok) {
    throw new Error(`GitHub commit 실패: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as {
    commit?: { sha?: string; html_url?: string };
  };
  return {
    commitSha: data.commit?.sha ?? "",
    htmlUrl: data.commit?.html_url ?? "",
    overwrote: sha !== null,
  };
}
