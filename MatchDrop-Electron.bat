@echo off
REM === MatchDrop Electron launcher ===
REM 移動: このバッチがあるフォルダに
cd /d "%~dp0"
setlocal

REM ローカル electron.cmd があればそれを使用
if exist "node_modules\.bin\electron.cmd" (
    echo Launching local Electron...
    call "node_modules\.bin\electron.cmd" .
) else (
    echo Local Electron not found. Using npx electron...
    npx electron .
)

endlocal
