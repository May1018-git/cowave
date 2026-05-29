@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo    Cowave - 데이터 올리기
echo ============================================
echo.
echo [1/4] 새 파일 담는 중...
git add .
echo.
echo [2/4] 저장(commit)...
git commit -m "update data"
echo.
echo [3/4] 최신 변경 받아오기 (겹치면 내 파일 우선)...
git pull --no-edit -X ours origin claude/hopeful-curie-n7gjB
echo.
echo [4/4] 올리는 중(push)...
git push
echo.
echo ============================================
echo    완료! 2~3분 뒤 사이트에 반영됩니다.
echo    위에 빨간 글자(error)가 보이면 캡처해서 보내주세요.
echo ============================================
echo.
pause
