@echo off
setlocal enabledelayedexpansion
cd /d "C:\Users\quest\Programming\GoInvo\goinvo-website"

REM ------------------------------------------------------------------
REM deploy-check.bat — production-readiness sweep
REM
REM Pipeline:
REM   1. npm run build  (Next production build)
REM   2. npm test       (vitest)
REM   3. git status     (capture pre-commit state)
REM   4. git add -A + git commit + git push
REM
REM All output captured to deploy-check.log so the run can be reviewed
REM out-of-band. A single status line is also written to
REM deploy-check-status.txt for quick "did it pass?" checks.
REM ------------------------------------------------------------------

set LOG=deploy-check.log
set STATUS=deploy-check-status.txt

> "%LOG%" echo === DEPLOY READINESS START %date% %time% ===
>> "%LOG%" echo.

REM --- 1. BUILD ----------------------------------------------------
>> "%LOG%" echo === BUILD ===
call npm run build >> "%LOG%" 2>&1
if errorlevel 1 (
    > "%STATUS%" echo BUILD_FAILED
    >> "%LOG%" echo.
    >> "%LOG%" echo *** BUILD FAILED — see lines above ***
    echo BUILD FAILED. See deploy-check.log for details.
    pause
    exit /b 1
)
>> "%LOG%" echo *** BUILD OK ***

REM --- 2. TESTS ----------------------------------------------------
>> "%LOG%" echo.
>> "%LOG%" echo === TESTS ===
call npm test >> "%LOG%" 2>&1
set TESTRC=%errorlevel%
>> "%LOG%" echo *** TESTS exit code: %TESTRC% ***

REM --- 3. GIT STATUS BEFORE COMMIT ---------------------------------
>> "%LOG%" echo.
>> "%LOG%" echo === GIT STATUS BEFORE COMMIT ===
call git status --short >> "%LOG%" 2>&1

REM --- 4. COMMIT + PUSH (skip if nothing to commit) ----------------
>> "%LOG%" echo.
>> "%LOG%" echo === COMMIT ===
call git add -A >> "%LOG%" 2>&1
git diff --cached --quiet
if errorlevel 1 (
    call git commit -m "Studio Knowledge Base + audit re-pass" -m "- gettingStarted.tsx: replace path picker with full Knowledge Base — 25 articles across 6 categories, 62 step checkboxes, search filter, intent buttons that link straight into the right Studio list. Per-step progress in localStorage." -m "- HomeContent.tsx: overflow-hidden on the three story-card sections so the Framer Motion Reveal slide-left initial transform doesn't paint a 14px horizontal scrollbar on mobile. Also w-full on the cards." -m "- careplans.css: header link color override (Bootstrap was recoloring all <a> to its hyperlink blue, dropping contrast to 3.13:1). axe color-contrast violations on /vision/care-plans go from 8 -> 3 (the 3 remaining are on the legacy in-page Part1/2/3 sub-nav, same set the original audit caught)." >> "%LOG%" 2>&1

    >> "%LOG%" echo.
    >> "%LOG%" echo === PUSH ===
    call git push origin main >> "%LOG%" 2>&1
) else (
    >> "%LOG%" echo (nothing to commit)
)

>> "%LOG%" echo.
>> "%LOG%" echo === DONE %date% %time% ===
> "%STATUS%" echo BUILD_OK_TESTS_%TESTRC%_FINISHED_%date%_%time%

echo.
echo Done. Output captured in deploy-check.log
echo Status: see deploy-check-status.txt
echo.
pause
