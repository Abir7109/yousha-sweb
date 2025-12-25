param(
  [Parameter(Mandatory = $false)]
  [string]$SourcePath = "D:\apu final",

  # Set to 0 to import ALL images.
  [Parameter(Mandatory = $false)]
  [ValidateRange(0, 10000)]
  [int]$Max = 0
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot ".."))
$dstAssets = Join-Path $projectRoot "assets"
$dstGallery = Join-Path $dstAssets "gallery"

if (!(Test-Path -LiteralPath $SourcePath)) {
  throw "Source folder not found: $SourcePath"
}

$imgs = Get-ChildItem -LiteralPath $SourcePath -File -Recurse |
  Where-Object { $_.Extension -match '^\.(jpg|jpeg|png|webp)$' } |
  Sort-Object @{Expression='LastWriteTime';Descending=$true}, @{Expression='Name';Descending=$false}

if ($imgs.Count -lt 1) {
  throw "No images found in: $SourcePath"
}

# Limit to $Max for performance on mobile. (0 means "all")
$take = if ($Max -eq 0) { $imgs.Count } else { [Math]::Min($imgs.Count, $Max) }

# Backup previously-imported numbered images (if any)
$existing = @()
if (Test-Path -LiteralPath $dstGallery) {
  $existing = Get-ChildItem -LiteralPath $dstGallery -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^\d+\.(jpg|jpeg|png|webp)$' }
}

if ($existing.Count -gt 0) {
  $backup = Join-Path $dstAssets ("gallery_backup_" + (Get-Date -Format 'yyyyMMdd_HHmmss'))
  New-Item -ItemType Directory -Force -Path $backup | Out-Null
  Move-Item -LiteralPath $existing.FullName -Destination $backup -Force
  Write-Host "Backed up $($existing.Count) old gallery images to: $backup"
}

# Copy portrait (newest image)
New-Item -ItemType Directory -Force -Path $dstAssets | Out-Null
Copy-Item -LiteralPath $imgs[0].FullName -Destination (Join-Path $dstAssets 'yousha.jpg') -Force

# Copy gallery images as 1.jpg, 2.jpg, ...
New-Item -ItemType Directory -Force -Path $dstGallery | Out-Null
for ($i = 0; $i -lt $take; $i++) {
  $dest = Join-Path $dstGallery ("{0}.jpg" -f ($i + 1))
  Copy-Item -LiteralPath $imgs[$i].FullName -Destination $dest -Force
}

# Write a manifest so the website can load the exact list without guessing.
$manifestItems = @()
for ($i = 0; $i -lt $take; $i++) {
  $orig = $imgs[$i].Name
  $base = [System.IO.Path]::GetFileNameWithoutExtension($orig)
  $title = ($base -replace '_', ' ') -replace '\s+', ' '

  $manifestItems += [pscustomobject]@{
    id = $i
    src = "assets/gallery/{0}.jpg" -f ($i + 1)
    title = $title
    caption = "$title ✨"
    original = $orig
  }
}

$manifest = [pscustomobject]@{
  version = 1
  generatedAt = (Get-Date).ToString('o')
  count = $take
  items = $manifestItems
}

$manifestPath = Join-Path $dstGallery 'manifest.json'
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

Write-Host "Imported portrait -> assets/yousha.jpg"
Write-Host "Imported gallery count -> $take (assets/gallery/1.jpg..$take.jpg)"
Write-Host "Wrote manifest -> assets/gallery/manifest.json"
