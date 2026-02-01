param(
  [Parameter(Mandatory = $false)]
  [ValidateSet('patch', 'minor', 'major')]
  [string]$Bump = 'patch',

  [Parameter(Mandatory = $false)]
  [string]$Version,

  [Parameter(Mandatory = $false)]
  [string]$Otp,

  [Parameter(Mandatory = $false)]
  [switch]$SkipGhRelease,

  [Parameter(Mandatory = $false)]
  [switch]$SkipTypecheck,

  [Parameter(Mandatory = $false)]
  [switch]$SkipBuild,

  [Parameter(Mandatory = $false)]
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][scriptblock]$Action
  )
  Write-Host ''
  Write-Host "==> $Title"
  if ($DryRun) {
    Write-Host '    (dry-run)'
    return
  }
  & $Action
}

function Assert-Ok {
  param([Parameter(Mandatory = $true)][bool]$Condition, [Parameter(Mandatory = $true)][string]$Message)
  if (-not $Condition) { throw $Message }
}

Set-Location -LiteralPath (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..'))

Assert-Ok (Test-Path -LiteralPath 'package.json') 'package.json not found; run from repo root.'
Assert-Ok ((git rev-parse --is-inside-work-tree 2>$null) -eq 'true') 'Not a git repository.'

$status = (git status --porcelain)
Assert-Ok ([string]::IsNullOrWhiteSpace($status)) "Working tree not clean. Commit/stash first.`n$status"

$branch = (git branch --show-current).Trim()
Assert-Ok ($branch -eq 'main') "Current branch is '$branch' (expected 'main')."

$origin = (git remote get-url origin 2>$null)
Assert-Ok (-not [string]::IsNullOrWhiteSpace($origin)) "Missing git remote 'origin'."

Invoke-Step 'Verify npm auth' { npm whoami | Out-Host }

if (-not $SkipTypecheck) {
  Invoke-Step 'Typecheck' { npm run typecheck | Out-Host }
}

if (-not $SkipBuild) {
  Invoke-Step 'Build' { npm run build | Out-Host }
}

Invoke-Step 'Bump version (commit + tag)' {
  if ([string]::IsNullOrWhiteSpace($Version)) {
    npm version $Bump -m "chore(release): %s" | Out-Host
  } else {
    npm version $Version -m "chore(release): %s" | Out-Host
  }
}

$newVersion = (node -p "JSON.parse(require('fs').readFileSync('package.json','utf8')).version").Trim()
$tag = "v$newVersion"

Invoke-Step 'Push commit to origin' { git push origin HEAD | Out-Host }
Invoke-Step 'Push tags to origin' { git push origin --tags | Out-Host }

if (-not $SkipGhRelease) {
  Invoke-Step 'Create GitHub release (generate notes)' {
    gh release create $tag --title $tag --generate-notes | Out-Host
  }
}

if ([string]::IsNullOrWhiteSpace($Otp)) {
  $Otp = $env:NPM_OTP
}
if ([string]::IsNullOrWhiteSpace($Otp)) {
  $Otp = $env:NPM_CONFIG_OTP
}

Invoke-Step 'npm publish' {
  if ([string]::IsNullOrWhiteSpace($Otp)) {
    npm publish | Out-Host
  } else {
    npm publish --otp $Otp | Out-Host
  }
}

Write-Host ''
Write-Host "Done: $tag published"
