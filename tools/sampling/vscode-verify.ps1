param(
  [string]$OutDir = (Join-Path $env:TEMP 'fili-vscode-verify'),
  [string]$ProfileDir = (Join-Path $env:TEMP 'fili-vscode-capture'),
  [string]$Vsix,
  [string[]]$Only,
  [ValidateSet('dark', 'light', 'dark-extra-contrast', 'light-extra-contrast', 'dark-high-contrast')]
  [string[]]$Themes = @('dark', 'light'),
  [switch]$Tokens
)
# Renders the language samples in VS Code with the theme from this working tree, in Dark and Light,
# so the colours can be compared with Visual Studio's (sample-colors.ps1 on both captures).
#   -Vsix   a package to test; by default one is built from the working tree with vsce.
#   -Only   capture only these views, e.g. -Only json, diff (default: all of them).
#   -Themes capture in these themes instead, e.g. -Themes dark-extra-contrast, dark-high-contrast.
#   -Tokens also write the semantic tokens each language server sends to <OutDir>\tokens\<file>.txt
#           (semantic-tokens\, loaded as a development extension): the types and modifiers a
#           `type.modifier:language` selector in src/syntax.json must match.
# The first run installs the language extensions into the isolated profile (it needs the network); the
# theme is reinstalled on every run. Takes about 12 minutes; do not use the machine meanwhile.
$ErrorActionPreference = 'Stop'
$repo = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$code = Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\bin\code.cmd'
if (-not (Test-Path $code)) { $code = (Get-Command code -ErrorAction Stop).Source }
$user = Join-Path $ProfileDir 'user'; $ext = Join-Path $ProfileDir 'extensions'

if (-not $Vsix) {
  # vsce needs a working Node; a version manager's shim can sit on PATH with no version selected,
  # so fall back to the Node that Visual Studio ships.
  & node --version *> $null
  if ($LASTEXITCODE -ne 0) {
    $vs = & (Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe') -latest -prerelease -property installationPath
    $env:PATH = (Join-Path $vs 'MSBuild\Microsoft\VisualStudio\NodeJs') + [IO.Path]::PathSeparator + $env:PATH
  }
  $Vsix = Join-Path $env:TEMP 'fili-vscode-verify.vsix'
  Push-Location $repo
  try { npx --yes @vscode/vsce package --no-dependencies --changelog-path docs/CHANGELOG.md -o $Vsix | Select-Object -Last 1 } finally { Pop-Location }
}
# The language servers whose semantic tokens the theme maps: C#, C/C++, F# (Ionide) and Python
# (Pylance comes with it); and Avalonia for VSCode, whose AXAML grammar syntaxes/ injects into.
$installed = & $code --user-data-dir $user --extensions-dir $ext --list-extensions 2>$null
foreach ($id in 'ms-dotnettools.csharp', 'ms-vscode.cpptools', 'ionide.ionide-fsharp', 'ms-python.python', 'avaloniateam.vscode-avalonia') {
  if ($installed -notcontains $id) { & $code --user-data-dir $user --extensions-dir $ext --install-extension $id 2>$null | Select-Object -Last 1 }
}
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
  @{ slug = 'ts';       folder = "$L\Fili.Langs.Web"; args = @("$L\Fili.Langs.Web\orders.ts"); wait = 35 },
  @{ slug = 'js';       folder = "$L\Fili.Langs.Web"; args = @("$L\Fili.Langs.Web\site.js"); wait = 35 },
  @{ slug = 'xml';      folder = "$L\config"; args = @("$L\config\catalog.xml"); wait = 30 },
  @{ slug = 'msbuild';  folder = "$L\config"; args = @("$L\Fili.Langs.Web\Fili.Langs.Web.csproj"); wait = 30 },
  @{ slug = 'xaml';     folder = "$L\config"; args = @("$L\config\MainWindow.xaml"); wait = 30 },
  @{ slug = 'axaml';    folder = "$L\config"; args = @("$L\config\OrdersView.axaml"); wait = 45; devkit = $true },
  @{ slug = 'yaml';     folder = "$L\config"; args = @("$L\config\ci.yml"); wait = 30 },
  @{ slug = 'docker';   folder = "$L\config"; args = @("$L\config\Dockerfile"); wait = 30 },
  @{ slug = 'cpp';      folder = "$L\native"; args = @("$L\native\orders.cpp"); wait = 45 },
  @{ slug = 'fsharp';   folder = "$L\fsharp"; args = @("$L\fsharp\orders.fsx"); wait = 60 },
  @{ slug = 'python';   folder = "$L\python"; args = @("$L\python\orders.py"); wait = 45 },
  @{ slug = 'diff';     folder = $L; args = @('--diff', "$L\left.txt", "$L\right.txt"); wait = 30 },
  @{ slug = 'terminal'; folder = "$L\terminal"; args = @(); wait = 40 }
)
$labels = @{
  'dark' = 'Fili.VSCode2026 Dark'; 'light' = 'Fili.VSCode2026 Light'
  'dark-extra-contrast' = 'Fili.VSCode2026 Dark (Extra Contrast)'; 'light-extra-contrast' = 'Fili.VSCode2026 Light (Extra Contrast)'
  'dark-high-contrast' = 'Fili.VSCode2026 Dark (High Contrast)'
}
$probe = @()
if ($Tokens) {
  # The tokens do not depend on the theme, so the dump is the same in every theme's run.
  $env:FILI_SEMANTIC_TOKENS_OUT = Join-Path $OutDir 'tokens'
  $probe = @("--extensionDevelopmentPath=`"$(Join-Path $PSScriptRoot 'semantic-tokens')`"")
}
foreach ($t in $Themes) {
  foreach ($j in ($jobs | Where-Object { -not $Only -or $Only -contains $_.slug })) {
    try { & (Join-Path $PSScriptRoot 'vscode-capture.ps1') -Theme $labels[$t] -Folder $j.folder -CodeArgs ($probe + $j.args) -Out (Join-Path $OutDir "$t-$($j.slug).png") -Wait $j.wait -ProfileDir $ProfileDir -DevKit:([bool]$j.devkit) }
    catch { "$t-$($j.slug) failed: $_" }
  }
}
if ($Tokens) { "semantic tokens in $env:FILI_SEMANTIC_TOKENS_OUT" }
"captures in $OutDir"
