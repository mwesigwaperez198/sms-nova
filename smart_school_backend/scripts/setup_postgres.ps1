param(
    [string]$PostgresHost = "localhost",
    [int]$PostgresPort = 5432,
    [string]$PostgresUser = "postgres",
    [string]$DatabaseName = "smart_school",
    [string]$InitialSuperAdminEmail = "owner@example.com",
    [string]$InitialSuperAdminPassword = "ChangeMe123!",
    [string]$InitialSuperAdminName = "Platform Owner"
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$createdb = "C:\Program Files\PostgreSQL\18\bin\createdb.exe"
$pgIsReady = "C:\Program Files\PostgreSQL\18\bin\pg_isready.exe"

if (-not (Test-Path $psql)) {
    throw "psql.exe was not found at $psql"
}

if (-not (Test-Path $createdb)) {
    throw "createdb.exe was not found at $createdb"
}

if (-not (Test-Path $pgIsReady)) {
    throw "pg_isready.exe was not found at $pgIsReady"
}

& $pgIsReady -h $PostgresHost -p $PostgresPort | Write-Output

$securePassword = Read-Host "Enter PostgreSQL password for user '$PostgresUser'" -AsSecureString
$passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)

$env:PGPASSWORD = $plainPassword

try {
    & $createdb -h $PostgresHost -p $PostgresPort -U $PostgresUser $DatabaseName 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Output "Created database '$DatabaseName'."
    } else {
        Write-Output "Database '$DatabaseName' may already exist; continuing."
    }

    $encodedPassword = [System.Uri]::EscapeDataString($plainPassword)
    $databaseUrl = "postgresql+psycopg://${PostgresUser}:${encodedPassword}@${PostgresHost}:${PostgresPort}/${DatabaseName}"

    $envContent = @"
APP_NAME="Smart School Backend"
ENVIRONMENT=development
API_V1_PREFIX=/api/v1

DATABASE_URL=$databaseUrl

SECRET_KEY=change-this-secret-before-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

DEFAULT_COUNTRY=Uganda
DEFAULT_CURRENCY_CODE=UGX
DEFAULT_TIMEZONE=Africa/Kampala

BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:5173","http://localhost:8081"]

INITIAL_SUPER_ADMIN_EMAIL=$InitialSuperAdminEmail
INITIAL_SUPER_ADMIN_PASSWORD=$InitialSuperAdminPassword
INITIAL_SUPER_ADMIN_NAME=$InitialSuperAdminName
"@

    Set-Content -LiteralPath (Join-Path $projectRoot ".env") -Value $envContent -Encoding UTF8
    Write-Output "Wrote local .env file."

    Push-Location $projectRoot
    try {
        alembic upgrade head
        alembic current
    } finally {
        Pop-Location
    }
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    $plainPassword = $null
}

Write-Output "PostgreSQL setup complete."
