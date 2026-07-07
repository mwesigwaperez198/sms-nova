param(
  [string]$SuperAdminEmail = "admin@novasms.local",
  [string]$AdminEmail = "admin@novasms.local",
  [string]$HostName = "127.0.0.1",
  [int]$Port = 8000
)

$SuperAdminPassword = Read-Host "Super admin local password"
$AdminPassword = Read-Host "Admin local password"

$env:SMS_ENV = "local"
$env:SMS_SUPER_ADMIN_EMAIL = $SuperAdminEmail
$env:SMS_SUPER_ADMIN_PASSWORD = $SuperAdminPassword
$env:SMS_ADMIN_EMAIL = $AdminEmail
$env:SMS_ADMIN_PASSWORD = $AdminPassword

python -m uvicorn platform_core.main:app --host $HostName --port $Port --reload
