param([string]$Dir, [int]$TimeoutSec = 900)
# Waits for the driver's <name>.ready markers, captures the Extension Development Host window, answers <name>.done.
. {
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System; using System.Runtime.InteropServices;
public static class W2 {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint f);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
}
"@
}
$deadline = (Get-Date).AddSeconds($TimeoutSec)
$maximized = $false
while ((Get-Date) -lt $deadline -and -not (Test-Path "$Dir\finished")) {
  $ready = Get-ChildItem "$Dir\*.ready" -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $ready) { Start-Sleep -Milliseconds 250; continue }
  $name = $ready.BaseName
  $p = Get-Process Code -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*Extension Development Host*' } | Select-Object -First 1
  if ($p) {
    $h = $p.MainWindowHandle
    if (-not $maximized) { [W2]::ShowWindow($h, 3) | Out-Null; [W2]::SetForegroundWindow($h) | Out-Null; Start-Sleep -Seconds 2; $maximized = $true }
    $r = New-Object W2+RECT; [W2]::GetWindowRect($h, [ref]$r) | Out-Null
    $bmp = New-Object System.Drawing.Bitmap ($r.R - $r.L), ($r.B - $r.T)
    $g = [System.Drawing.Graphics]::FromImage($bmp); $hdc = $g.GetHdc()
    [W2]::PrintWindow($h, $hdc, 2) | Out-Null; $g.ReleaseHdc($hdc)
    $bmp.Save("$Dir\$name.png", [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose(); $g.Dispose()
    "captured $name"
  } else { "no window for $name" }
  Remove-Item $ready.FullName
  New-Item "$Dir\$name.done" -ItemType File | Out-Null
}
if (Test-Path "$Dir\finished") { "finished: $(Get-Content "$Dir\finished" -Raw)" } else { "timed out" }
