param(
  [Parameter(Mandatory)][string]$Theme,
  [Parameter(Mandatory)][string]$Folder,
  [string[]]$CodeArgs = @(),
  [Parameter(Mandatory)][string]$Out,
  [int]$Wait = 45,
  [string]$ProfileDir = (Join-Path $env:TEMP 'fili-vscode-capture')
)
# Captures one isolated VS Code window in one colour theme, for comparing with Visual Studio.
#   -Theme     a theme label, e.g. 'Fili.VSCode2026 Dark'
#   -Folder    the folder to open; -CodeArgs adds a file, '-g', 'file:line:col' or '--diff', 'a', 'b'
#   -ProfileDir holds the isolated user data and extensions (see vscode-verify.ps1, which installs
#              the theme and the C# extension there)
# Only processes started with this profile are ever stopped. The window is brought to the front
# before the capture, because VS Code does not paint a covered window.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
if (-not ('FiliCode' -as [type])) {
  Add-Type @"
using System; using System.Runtime.InteropServices;
public static class FiliCode {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint f);
}
"@
}
$code = Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\Code.exe'
if (-not (Test-Path $code)) { $code = Join-Path (Split-Path (Split-Path (Get-Command code -ErrorAction Stop).Source)) 'Code.exe' }
$user = Join-Path $ProfileDir 'user'; $ext = Join-Path $ProfileDir 'extensions'
function Mine { Get-CimInstance Win32_Process -Filter "Name='Code.exe'" | Where-Object { $_.CommandLine -like "*$user*" } }
function StopMine { foreach ($p in Mine) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }; Start-Sleep -Seconds 2 }

StopMine
New-Item -ItemType Directory -Force (Join-Path $user 'User') | Out-Null
@{
  'workbench.colorTheme' = $Theme; 'window.restoreWindows' = 'none'; 'workbench.startupEditor' = 'none'
  'security.workspace.trust.enabled' = $false; 'telemetry.telemetryLevel' = 'off'; 'update.mode' = 'none'
  'extensions.autoUpdate' = $false; 'extensions.autoCheckUpdates' = $false; 'git.enabled' = $false
  'workbench.tips.enabled' = $false; 'chat.disableAIFeatures' = $true; 'editor.fontSize' = 14
  'editor.minimap.enabled' = $false; 'window.zoomLevel' = 0; 'task.allowAutomaticTasks' = 'on'
} | ConvertTo-Json | Set-Content (Join-Path $user 'User\settings.json')

# C# Dev Kit is disabled: it opens an announcement over the editor, and uninstalling it from a
# profile removes the C# extension with it.
$argList = @('--user-data-dir', "`"$user`"", '--extensions-dir', "`"$ext`"", '--new-window', '--disable-extension', 'ms-dotnettools.csdevkit', "`"$Folder`"") +
  @($CodeArgs | ForEach-Object { if ($_ -like '-*') { $_ } else { "`"$_`"" } })
Start-Process $code -ArgumentList $argList | Out-Null
Start-Sleep -Seconds $Wait
$win = Mine | ForEach-Object { Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue } | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $win) { StopMine; throw 'no VS Code window for the isolated profile' }
$h = $win.MainWindowHandle
[FiliCode]::ShowWindow($h, 3) | Out-Null
if (-not [FiliCode]::SetForegroundWindow($h)) { [FiliCode]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero); [FiliCode]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero); [FiliCode]::SetForegroundWindow($h) | Out-Null }
[FiliCode]::BringWindowToTop($h) | Out-Null
Start-Sleep -Seconds 3
$r = New-Object FiliCode+RECT; [FiliCode]::GetWindowRect($h, [ref]$r) | Out-Null
$bmp = New-Object System.Drawing.Bitmap ($r.R - $r.L), ($r.B - $r.T)
$g = [System.Drawing.Graphics]::FromImage($bmp); $hdc = $g.GetHdc()
[FiliCode]::PrintWindow($h, $hdc, 2) | Out-Null; $g.ReleaseHdc($hdc)
New-Item -ItemType Directory -Force (Split-Path $Out) | Out-Null
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose(); $g.Dispose()
"captured $(Split-Path $Out -Leaf)"
StopMine
