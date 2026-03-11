param(
    [switch]$SkipLint,
    [switch]$SkipTests,
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

function Invoke-Step {
    param(
        [string]$Name,
        [scriptblock]$Action
    )

    Write-Host "`n=== $Name ===" -ForegroundColor Cyan
    $global:LASTEXITCODE = 0
    & $Action

    $stepExitCode = 0
    if ($null -ne $LASTEXITCODE) {
        $stepExitCode = $LASTEXITCODE
    } elseif (-not $?) {
        $stepExitCode = 1
    }

    if ((-not $?) -and $stepExitCode -eq 0) {
        $stepExitCode = 1
    }

    if ($stepExitCode -ne 0) {
        throw "$Name fehlgeschlagen mit ExitCode $stepExitCode"
    }
    Write-Host "$Name erfolgreich" -ForegroundColor Green
}

Write-Host "Starte Skill Gate (lint -> test:run -> build)" -ForegroundColor Yellow
try {
    if (-not $SkipLint) {
        Invoke-Step -Name 'Lint' -Action { npm run lint }
    } else {
        Write-Host "Lint übersprungen" -ForegroundColor DarkYellow
    }

    if (-not $SkipTests) {
        Invoke-Step -Name 'Tests' -Action { npm run test:run }
    } else {
        Write-Host "Tests übersprungen" -ForegroundColor DarkYellow
    }

    if (-not $SkipBuild) {
        Invoke-Step -Name 'Build' -Action { npm run build }
    } else {
        Write-Host "Build übersprungen" -ForegroundColor DarkYellow
    }

    Write-Host "`nSkill Gate abgeschlossen" -ForegroundColor Green
    exit 0
} catch {
    Write-Error $_
    exit 1
}
