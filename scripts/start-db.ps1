# Starts the recovered PostgreSQL 15 server for Aqim.
# The server runs from portable binaries against the recovered data cluster
# (it is NOT a Windows service, so it must be started after each reboot).
$bin  = 'C:\Users\Admin\aqim-pg\pgsql\bin'
$data = 'C:\Users\Admin\aqim-pgdata'

$listening = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue
if ($listening) {
  Write-Host "PostgreSQL already listening on port 5432." -ForegroundColor Green
  exit 0
}

& "$bin\pg_ctl.exe" -D $data -o "-p 5432" -w start
if ($LASTEXITCODE -eq 0) {
  Write-Host "PostgreSQL started on port 5432 (cluster: $data)." -ForegroundColor Green
} else {
  Write-Host "Failed to start PostgreSQL. Check $data\log for details." -ForegroundColor Red
}
