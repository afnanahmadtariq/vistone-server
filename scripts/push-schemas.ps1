# Push all Prisma schemas to the database
# Run this after creating the PostgreSQL schemas

Write-Host "Pushing Prisma schemas to database..." -ForegroundColor Cyan

# Load .env file from root
$envFile = Join-Path $PSScriptRoot "../.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "Loaded environment variables from .env" -ForegroundColor Green
} else {
    Write-Host "Warning: .env file not found at $envFile" -ForegroundColor Red
    Write-Host "Please create .env file with DATABASE_URL" -ForegroundColor Red
    exit 1
}

$services = @(
    "auth-service",
    "workforce-management",
    "project-management",
    "client-management",
    "knowledge-hub",
    "communication",
    "monitoring-reporting",
    "notification",
    "ai-engine"
)

foreach ($service in $services) {
    Write-Host "`nPushing schema for $service..." -ForegroundColor Yellow
    Push-Location "apps/$service"
    npx prisma db push
    Pop-Location
}

Write-Host "`nGenerating Prisma clients..." -ForegroundColor Cyan

foreach ($service in $services) {
    Write-Host "Generating client for $service..." -ForegroundColor Yellow
    Push-Location "apps/$service"
    npx prisma generate
    Pop-Location
}

Write-Host "`nAll schemas pushed and clients generated!" -ForegroundColor Green
