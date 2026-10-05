param(
  [string]$OutDir = (Join-Path $env:TEMP 'fili-vscode-verify'),
  [string]$ProfileDir = (Join-Path $env:TEMP 'fili-vscode-capture'),
  [string]$Vsix,
  [string[]]$Only
)
# Renders the language samples in VS Code with the theme from this working tree, in Dark and Light,
# so the colours can be compared with Visual Studio's (sample-colors.ps1 on both captures).
#   -Vsix   a package to test; by default one is built from the working tree with vsce.
#   -Only   capture only these views, e.g. -Only json, diff (default: all of them).
# The first run installs the C# extension into the isolated profile (it needs the network); the
# theme is reinstalled on every run. Takes about 12 minutes; do not use the machine meanwhile.
$ErrorActionPreference = 'Stop'
$repo = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$code = Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\bin\code.cmd'
if (-not (Test-Path $code)) { $code = (Get-Command code -ErrorAction Stop).Source }
$user = Join-Path $ProfileDir 'user'; $ext = Join-Path $ProfileDir 'extensions'

if (-not $Vsix) {
  $Vsix = Join-Path $env:TEMP 'fili-vscode-verify.vsix'
  Push-Location $repo
  try { npx --yes @vscode/vsce package --no-dependencies --changelog-path docs/CHANGELOG.md -o $Vsix | Select-Object -Last 1 } finally { Pop-Location }
}
$installed = & $code --user-data-dir $user --extensions-dir $ext --list-extensions 2>$null
if ($installed -notcontains 'ms-dotnettools.csharp') { & $code --user-data-dir $user --extensions-dir $ext --install-extension ms-dotnettools.csharp 2>$null | Select-Object -Last 1 }
& $code --user-data-dir $user --extensions-dir $ext --install-extension $Vsix --force 2>$null | Select-Object -Last 1

$work = Join-Path $env:TEMP 'fili-vscode-verify-samples'
if (Test-Path $work) { Remove-Item $work -Recurse -Force }
Copy-Item (Join-Path $PSScriptRoot '..\samples') $work -Recurse
$work = (Get-Item $work).FullName   # long path: the C# server rejects 8.3 short paths
$L = Join-Path $work 'languages'
$jobs = @(
  @{ slug = 'cs-refs';  folder = $L; args = @('-g', "$L\Fili.Langs.Cli\Program.cs:7:14"); wait = 75 },
  @{ slug = 'ps1';      folder = $L; args = @("$L\Fili.Langs.Cli\build.ps1"); wait = 35 },
  @{ slug = 'vb';       folder = $L; args = @("$L\Fili.Langs.Vb\Program.vb"); wait = 35 },
  @{ slug = 'razor';    folder = "$L\Fili.Langs.Web"; args = @("$L\Fili.Langs.Web\Orders.razor"); wait = 120 },
  @{ slug = 'md';       folder = $L; args = @("$L\Fili.Langs.Cli\NOTES.md"); wait = 30 },
  @{ slug = 'json';     folder = $L; args = @("$L\Fili.Langs.Web\data.json"); wait = 30 },
  @{ slug = 'scss';     folder = $L; args = @("$L\Fili.Langs.Web\site.scss"); wait = 30 },
  @{ slug = 'sql';      folder = $L; args = @("$L\Fili.Langs.Web\query.sql"); wait = 30 },
  @{ slug = 'diff';     folder = $L; args = @('--diff', "$L\left.txt", "$L\right.txt"); wait = 30 },
  @{ slug = 'terminal'; folder = "$L\terminal"; args = @(); wait = 40 }
)
foreach ($t in @(@('Fili.VSCode2026 Dark', 'dark'), @('Fili.VSCode2026 Light', 'light'))) {
  foreach ($j in ($jobs | Where-Object { -not $Only -or $Only -contains $_.slug })) {
    try { & (Join-Path $PSScriptRoot 'vscode-capture.ps1') -Theme $t[0] -Folder $j.folder -CodeArgs $j.args -Out (Join-Path $OutDir "$($t[1])-$($j.slug).png") -Wait $j.wait -ProfileDir $ProfileDir }
    catch { "$($t[1])-$($j.slug) failed: $_" }
  }
}
"captures in $OutDir"
