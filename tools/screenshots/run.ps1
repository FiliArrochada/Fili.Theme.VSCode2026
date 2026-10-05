param(
  [ValidateSet('scenes', 'gallery', 'docs')][string[]]$Pass = @('scenes', 'gallery'),
  [string]$OutDir = (Join-Path $env:TEMP 'fili-screenshots'),
  [string]$ExtensionsDir = (Join-Path $env:TEMP 'fvx'),
  [switch]$Publish
)
# Retakes the README screenshots from the working tree's theme.
#   scenes   overview, IntelliSense, hover, Peek, Problems, palette, SCM, diff, notifications,
#            testing and debugging, in Dark and Light (sample: tools/samples/editor)
#   gallery  the editor in all sixteen themes (tools/samples/editor)
#   docs     the one-time layout offer and C# Dev Kit's solution view (tools/samples/solution)
#   -Publish writes docs/screenshots/dark.png, light.png, dark-debug.png, light-problems.png and themes.png
#            from the scenes and gallery passes.
#
# VS Code runs as an Extension Development Host with this repository and the driver extension in
# driver/, on its own profile and extensions folder; capture.ps1 captures only that window. The
# C# extension (and C# Dev Kit for 'docs') must be in -ExtensionsDir. Keep that folder's path
# short: Dev Kit's server cannot start more than about 70 characters below it (Windows path limit).
# Takes about 15 minutes for scenes + gallery; do not use the machine meanwhile.
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$repo = (Resolve-Path (Join-Path $here '..\..')).Path
$code = Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\Code.exe'
if (-not (Test-Path $code)) { $code = Join-Path (Split-Path (Split-Path (Get-Command code -ErrorAction Stop).Source)) 'Code.exe' }
$cli = Join-Path (Split-Path $code) 'bin\code.cmd'

# The debugging scene launches tools/samples/editor/debug.js with this Node (launch.json reads it).
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  $vs = & (Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe') -latest -prerelease -property installationPath
  $node = Join-Path $vs 'MSBuild\Microsoft\VisualStudio\NodeJs\node.exe'
}
$env:FILI_SHOTS_NODE = $node

$installed = & $cli --extensions-dir $ExtensionsDir --list-extensions 2>$null
foreach ($id in @('ms-dotnettools.csharp') + $(if ($Pass -contains 'docs') { @('ms-dotnettools.csdevkit') } else { @() })) {
  if ($installed -notcontains $id) { & $cli --extensions-dir $ExtensionsDir --install-extension $id 2>$null | Select-Object -Last 1 }
}

$user = Join-Path $OutDir 'profile'
New-Item -ItemType Directory -Force (Join-Path $user 'User') | Out-Null
@{
  'window.titleBarStyle' = 'custom'; 'window.commandCenter' = $true; 'window.restoreWindows' = 'none'; 'window.newWindowDimensions' = 'maximized'
  'workbench.sideBar.location' = 'right'; 'workbench.activityBar.location' = 'top'; 'workbench.secondarySideBar.defaultVisibility' = 'hidden'
  'workbench.startupEditor' = 'none'; 'workbench.tips.enabled' = $false; 'workbench.editor.empty.hint' = 'hidden'
  'editor.fontFamily' = "'Cascadia Mono', Consolas, 'Courier New', monospace"; 'editor.fontSize' = 13; 'editor.minimap.enabled' = $false
  'editor.renderLineHighlight' = 'line'; 'editor.bracketPairColorization.enabled' = $true; 'editor.stickyScroll.enabled' = $true
  'terminal.integrated.fontFamily' = "'Cascadia Mono', Consolas, monospace"; 'security.workspace.trust.enabled' = $false
  'telemetry.telemetryLevel' = 'off'; 'update.mode' = 'none'; 'extensions.autoUpdate' = 'off'; 'extensions.autoCheckUpdates' = $false
  'chat.disableAIFeatures' = $true; 'git.openRepositoryInParentFolders' = 'never'; 'git.decorations.enabled' = $false
  'files.exclude' = @{ '**/bin' = $true; '**/obj' = $true; '**/.vs' = $true }
} | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $user 'User\settings.json')

# The samples are copied out of the repository first. The editor sample becomes a fresh git
# repository with nothing committed, so the status bar shows a branch the way a real project does.
$work = Join-Path $OutDir 'samples'
if (Test-Path $work) { Remove-Item $work -Recurse -Force }
Copy-Item (Join-Path $repo 'tools\samples') $work -Recurse
$work = (Get-Item $work).FullName   # long path: the C# server rejects 8.3 short paths
git -C (Join-Path $work 'editor') init -q

$runs = @{ scenes = @{ mode = ''; folder = 'editor'; t = 450 }; gallery = @{ mode = 'gallery'; folder = 'editor'; t = 320 }; docs = @{ mode = 'docs'; folder = 'solution'; t = 400 } }
foreach ($p in $Pass) {
  $dir = Join-Path $OutDir $p
  if (Test-Path $dir) { Remove-Item $dir -Recurse -Force }
  New-Item -ItemType Directory -Force $dir | Out-Null
  $env:FILI_SHOTS_DIR = $dir; $env:FILI_SHOTS_WARMUP = '75000'; $env:FILI_SHOTS_ONLY = $runs[$p].mode
  Start-Process $code -ArgumentList '--user-data-dir', "`"$user`"", '--extensions-dir', "`"$ExtensionsDir`"",
    "--extensionDevelopmentPath=`"$repo`"", "--extensionDevelopmentPath=`"$(Join-Path $here 'driver')`"", "`"$(Join-Path $work $runs[$p].folder)`""
  & (Join-Path $here 'capture.ps1') -Dir $dir -TimeoutSec $runs[$p].t | Select-Object -Last 1
  Get-Process Code -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*Extension Development Host*' } | ForEach-Object { $_.CloseMainWindow() | Out-Null }
  Start-Sleep -Seconds 6
  "${p}: $((Get-ChildItem (Join-Path $dir '*.png')).Count) captures in $dir"
}

if ($Publish) {
  $scenes = Join-Path $OutDir 'scenes'; $gallery = Join-Path $OutDir 'gallery'; $docs = Join-Path $repo 'docs\screenshots'
  Add-Type -AssemblyName System.Drawing
  # The Debug Console prints the Node path; paint its text area with the panel's own background so
  # no machine path ends up in a published image.
  $b = [System.Drawing.Bitmap]::FromFile((Join-Path $scenes 'dark-debug.png'))
  $panel = $b.GetPixel(700, $b.Height - 178)
  $g = [System.Drawing.Graphics]::FromImage($b); $g.FillRectangle((New-Object System.Drawing.SolidBrush $panel), 14, $b.Height - 300, 1530, 230); $g.Dispose()
  $clean = Join-Path $scenes 'dark-debug-clean.png'; $b.Save($clean); $b.Dispose()
  & (Join-Path $here 'crop.ps1') (Join-Path $gallery 'gallery-dark.png') (Join-Path $docs 'dark.png') -TopEnd 698 -BarStart 700
  & (Join-Path $here 'crop.ps1') (Join-Path $gallery 'gallery-light.png') (Join-Path $docs 'light.png') -TopEnd 698 -BarStart 700
  & (Join-Path $here 'crop.ps1') $clean (Join-Path $docs 'dark-debug.png') -TopEnd 698 -BarStart 700
  & (Join-Path $here 'crop.ps1') (Join-Path $scenes 'light-problems.png') (Join-Path $docs 'light-problems.png') -TopEnd 698 -BarStart 700
  $order = 'dark', 'dark-cool-slate', 'dark-juicy-plum', 'dark-moonlight-glow', 'dark-mystical-forest', 'dark-spicy-red', 'dark-extra-contrast', 'dark-high-contrast',
    'light', 'light-extra-contrast', 'light-bubblegum', 'light-cool-breeze', 'light-icy-mint', 'light-mango-paradise', 'light-silky-pink', 'light-sunny-day'
  $labels = $order | ForEach-Object { $s = $_ -replace '^(dark|light)-?', ''; $base = (Get-Culture).TextInfo.ToTitleCase(($_ -split '-')[0]); if ($s) { "$base ($((Get-Culture).TextInfo.ToTitleCase($s -replace '-', ' ')))" } else { $base } }
  & (Join-Path $here 'grid.ps1') -Out (Join-Path $docs 'themes.png') -Images ($order | ForEach-Object { Join-Path $gallery "gallery-$_.png" }) -Labels $labels -Cols 4 -CellW 480 -CropH 728
  'docs/ images rebuilt; check the debugging screenshot before committing'
}
