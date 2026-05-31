# Sync shared code from main repo to paddyngton-mobile
param(
  [string]$MobileRepo = "../paddyngton-mobile"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "Syncing shared code to $MobileRepo..." -ForegroundColor Cyan

$dirs = @(
  "src/types",
  "src/store",
  "src/hooks",
  "src/lib",
  "src/translations",
  "src/constants",
  "src/components/dialogs",
  "src/components/panels",
  "src/components/editor"
)

$files = @(
  "src/i18n.tsx"
)

# Remove old shared
Remove-Item -Recurse -Force "$MobileRepo/shared" -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "$MobileRepo/shared" -Force | Out-Null

# Copy dirs
foreach ($dir in $dirs) {
  $target = Join-Path $MobileRepo "shared/$dir"
  New-Item -ItemType Directory -Path $target -Force | Out-Null
  Copy-Item -Recurse "$Root/$dir/*" $target
}

# Copy files
foreach ($file in $files) {
  Copy-Item "$Root/$file" "$MobileRepo/shared/$file"
}

Write-Host "Done. Shared code synced to $MobileRepo/shared/" -ForegroundColor Green
