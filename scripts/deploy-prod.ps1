param(
  [string]$BackendDir = (Join-Path $PSScriptRoot "..\backend-django"),
  [string]$ComposeFile = "docker-compose.prod.yml"
)

$ErrorActionPreference = "Stop"

function Read-EnvFile {
  param([string]$Path)

  $map = @{}
  Get-Content -Path $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    $map[$key] = $value
  }
  return $map
}

function Require-Keys {
  param(
    [hashtable]$Map,
    [string[]]$Keys
  )

  $missing = @()
  foreach ($k in $Keys) {
    if (-not $Map.ContainsKey($k) -or [string]::IsNullOrWhiteSpace($Map[$k])) {
      $missing += $k
    }
  }
  if ($missing.Count -gt 0) {
    throw "Fehlende oder leere Variablen in .env.app: $($missing -join ', ')"
  }
}

Write-Host "== Preflight ==" -ForegroundColor Cyan

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker wurde nicht gefunden."
}

$backendPath = Resolve-Path $BackendDir
$composePath = Join-Path $backendPath $ComposeFile
$envAppPath = Join-Path $backendPath ".env.app"
$envDockerPath = Join-Path $backendPath ".env"
$configPath = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")) "public\config.json"

if (-not (Test-Path $composePath)) { throw "Compose-Datei fehlt: $composePath" }
if (-not (Test-Path $envAppPath)) { throw ".env.app fehlt: $envAppPath" }
if (-not (Test-Path $envDockerPath)) { throw ".env fehlt: $envDockerPath" }
if (-not (Test-Path $configPath)) { throw "public/config.json fehlt: $configPath" }

$envApp = Read-EnvFile -Path $envAppPath
$required = @(
  "SECRET_KEY","DEBUG","ALLOWED_HOSTS","ALLOWED_ORIGINS",
  "DB_NAME","DB_USER","DB_PASSWORD","DB_HOST","DB_PORT",
  "ADMIN_USERNAME","ADMIN_PASSWORD_HASH","ADMIN_ROLE","CUSTOMER_KEY",
  "SMTP_HOST","SMTP_PORT","SMTP_USERNAME","SMTP_PASSWORD","SMTP_ENCRYPTION",
  "FROM_EMAIL","FROM_NAME","RECIPIENT_EMAIL",
  "ENCRYPTION_KEY","JWT_SECRET","JWT_EXPIRE_HOURS","JWT_COOKIE_NAME",
  "JWT_COOKIE_SECURE",
  "PDF_API_SECRET","PDF_RATE_LIMIT"
)
Require-Keys -Map $envApp -Keys $required

if ($envApp["DEBUG"] -ne "False") {
  throw "DEBUG muss in Produktion auf False stehen."
}
if ($envApp["JWT_COOKIE_SECURE"] -notin @("True","true","1","yes","on")) {
  throw "JWT_COOKIE_SECURE muss in Produktion aktiviert sein (True)."
}

$configJson = Get-Content -Path $configPath -Raw | ConvertFrom-Json
$pdfApiKey = $configJson.technical.pdf_api_key
$pdfApiSecret = $envApp["PDF_API_SECRET"]
if ([string]::IsNullOrWhiteSpace($pdfApiKey)) {
  throw "technical.pdf_api_key ist leer in public/config.json"
}
if ($pdfApiKey -ne $pdfApiSecret) {
  throw "Mismatch: technical.pdf_api_key != PDF_API_SECRET"
}

Write-Host "Preflight OK" -ForegroundColor Green

Write-Host "== Deploy Docker ==" -ForegroundColor Cyan
Push-Location $backendPath
try {
  docker compose -f $ComposeFile up -d --build
  docker compose -f $ComposeFile exec web python manage.py migrate
  docker compose -f $ComposeFile ps
}
finally {
  Pop-Location
}

Write-Host "== Healthcheck ==" -ForegroundColor Cyan
try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -Method GET -TimeoutSec 15
  $healthJson = $health | ConvertTo-Json -Depth 6
  Write-Host "Healthcheck erfolgreich:"
  Write-Host $healthJson
}
catch {
  throw "Healthcheck fehlgeschlagen: $($_.Exception.Message)"
}

Write-Host "Deployment abgeschlossen." -ForegroundColor Green
