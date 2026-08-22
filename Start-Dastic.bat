@echo off
setlocal

rem Always run from this file's own folder, no matter where it's launched from.
cd /d "%~dp0"

echo Starting Dastic...
call "node_modules\.bin\electron.cmd" .

if errorlevel 1 (
    echo.
    echo Dastic exited with an error. See above for details.
    pause
)

endlocal
