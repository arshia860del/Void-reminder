# The Void Markt - Windows PowerShell Reminder Scheduler
# Runs 'tgcloud run endpoints/tick' periodically (default every 60 seconds)
# Usage: .\scripts\tick.ps1 [-IntervalSeconds 60]

param(
    [int]$IntervalSeconds = 15
)

Write-Host "==========================================================" -ForegroundColor Magenta
Write-Host "  THE VOID MARKT - TELEGRAM SERVERLESS REMINDER TICKER   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Magenta
Write-Host "Interval: Every $IntervalSeconds seconds" -ForegroundColor Gray
Write-Host "Press Ctrl+C to terminate.`n" -ForegroundColor DarkGray

while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] Executing TGCloud tick..." -ForegroundColor DarkCyan
    
    try {
        npx tgcloud run endpoints/tick '{}'
    } catch {
        Write-Host "[$timestamp] Error running tick: $_" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds $IntervalSeconds
}
