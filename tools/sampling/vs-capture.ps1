param(
  [Parameter(Mandatory)][ValidateSet('dark', 'light')][string]$Theme,
  [Parameter(Mandatory)][ValidateSet('editor', 'languages', 'snippet', 'terminal', 'diff', 'codelens')][string]$Scenario,
  [string]$OutDir = (Join-Path $env:TEMP "fili-vs-capture\$Scenario-$Theme"),
  [string]$RootSuffix = 'FiliVs2026Ref',
  [int]$Wait = 75
)
# Captures Visual Studio 2026 in one theme, in one scenario, for measuring colours with
# sample-colors.ps1. Visual Studio runs on an isolated settings hive (devenv /rootsuffix), so the
# user's own Visual Studio and its settings are never touched, and on a temporary copy of
# tools/samples/languages, so it never writes into the repository.
#
# The instance is driven through its automation object (DTE), found in the Running Object Table by
# the process id this script started; it is never looked up by name, so no other Visual Studio can
# be picked up. Visual Studio only paints while its window is visible, so the window is brought to
# the front before every capture. The 'snippet' and 'terminal' scenarios need keystrokes; they are
# sent only after checking that this window is the foreground window, and refused otherwise. The
# 'codelens' scenario moves the mouse pointer and puts it back. Do not use the machine while it runs.
#
# Scenarios (captures written to $OutDir):
#   editor     open, refs (caret on a name), brace, bp-disabled, break, caller (caller frame
#              selected), markdown, find (Find on ';', so no reference highlight mixes in)
#   languages  one capture per sample file: vb, ps1, razor, json, scss, less, sql, html
#   snippet    an expanded 'prop' snippet with its fields
#   terminal   the integrated terminal printing the 16 ANSI colours as backgrounds
#   diff       the diff view of left.txt and right.txt
#   codelens   a CodeLens label at rest and hovered
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing, System.Windows.Forms

if (-not ('FiliVs' -as [type])) {
  Add-Type @"
using System; using System.Runtime.InteropServices; using System.Runtime.InteropServices.ComTypes;
public static class FiliVs {
  [DllImport("ole32.dll")] static extern int GetRunningObjectTable(int r, out IRunningObjectTable p);
  [DllImport("ole32.dll")] static extern int CreateBindCtx(int r, out IBindCtx p);
  public static object Rot(string name) {
    IRunningObjectTable rot; GetRunningObjectTable(0, out rot);
    IEnumMoniker e; rot.EnumRunning(out e);
    IMoniker[] m = new IMoniker[1];
    while (e.Next(1, m, IntPtr.Zero) == 0) {
      IBindCtx ctx; CreateBindCtx(0, out ctx);
      string dn; m[0].GetDisplayName(ctx, null, out dn);
      if (dn == name) { object o; rot.GetObject(m[0], out o); return o; }
    }
    return null;
  }
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint f);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
}
"@
}

# --- locate Visual Studio, the isolated hive and the sample ---------------------------------------
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$devenv = & $vswhere -latest -prerelease -property productPath
if (-not $devenv) { throw 'Visual Studio not found (vswhere returned nothing)' }
$hive = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Microsoft\VisualStudio') -Directory -Filter "*_*$RootSuffix" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $hive) { throw "no isolated hive '$RootSuffix' yet: start it once with  devenv /rootsuffix $RootSuffix  and close it" }

$work = Join-Path $env:TEMP 'fili-vs-capture\samples'
if (Test-Path $work) { Remove-Item $work -Recurse -Force }
Copy-Item (Join-Path $PSScriptRoot '..\samples') $work -Recurse
$langs = Join-Path $work 'languages'
$cs = Join-Path $langs 'Fili.Langs.Cli\Program.cs'
New-Item -ItemType Directory -Force $OutDir | Out-Null

function RefInstances { Get-CimInstance Win32_Process -Filter "Name='devenv.exe'" | Where-Object { $_.CommandLine -match "rootsuffix\s+`"?$RootSuffix`"?(\s|$)" } }
function CloseRef { foreach ($r in RefInstances) { $p = Get-Process -Id $r.ProcessId -ErrorAction SilentlyContinue; if ($p) { $p.CloseMainWindow() | Out-Null; if (-not $p.WaitForExit(30000)) { $p.Kill() } } } }
function Retry([scriptblock]$sb) {
  for ($i = 0; $i -lt 40; $i++) { try { return & $sb } catch { if ($_.Exception.Message -match 'RPC_E_CALL_REJECTED|0x80010001|busy') { Start-Sleep -Milliseconds 500 } else { throw } } }
  throw 'Visual Studio stayed busy'
}
function Front {
  $proc.Refresh(); $h = $proc.MainWindowHandle
  [FiliVs]::ShowWindow($h, 3) | Out-Null
  if (-not [FiliVs]::SetForegroundWindow($h)) { [FiliVs]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero); [FiliVs]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero); [FiliVs]::SetForegroundWindow($h) | Out-Null }
  [FiliVs]::BringWindowToTop($h) | Out-Null
  Start-Sleep -Seconds 2
}
function Shot([string]$name) {
  Start-Sleep -Seconds 3
  Front
  $h = $proc.MainWindowHandle
  $r = New-Object FiliVs+RECT; [FiliVs]::GetWindowRect($h, [ref]$r) | Out-Null
  $bmp = New-Object System.Drawing.Bitmap ($r.R - $r.L), ($r.B - $r.T)
  $g = [System.Drawing.Graphics]::FromImage($bmp); $hdc = $g.GetHdc()
  [FiliVs]::PrintWindow($h, $hdc, 2) | Out-Null; $g.ReleaseHdc($hdc)
  $bmp.Save((Join-Path $OutDir "$name.png"), [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose(); $g.Dispose()
  "captured $name"
}
function SendSafe([string]$keys) {
  if ([FiliVs]::GetForegroundWindow() -ne $proc.MainWindowHandle) { Front }
  if ([FiliVs]::GetForegroundWindow() -ne $proc.MainWindowHandle) { throw 'the Visual Studio window is not in front; refusing to send keys' }
  [System.Windows.Forms.SendKeys]::SendWait($keys)
}
function Esc([string]$t) { ($t.ToCharArray() | ForEach-Object { if ('{}()+^%~[]'.Contains($_)) { '{' + $_ + '}' } else { "$_" } }) -join '' }
function OpenActive([string]$path) {
  $win = Retry { $dte.ItemOperations.OpenFile($path) }
  foreach ($w in @($win)) { Retry { $w.Activate() } }
  Start-Sleep -Seconds 1
  $active = Retry { $dte.ActiveDocument.Name }
  if ($active -ne (Split-Path $path -Leaf)) { throw "expected $(Split-Path $path -Leaf) in front, Visual Studio shows $active" }
}

# --- start the isolated instance in the requested theme --------------------------------------------
CloseRef
$settings = Join-Path $hive.FullName 'settings.json'
$json = if (Test-Path $settings) { Get-Content $settings -Raw | ConvertFrom-Json -AsHashtable } else { @{} }
$json['environment.visualExperience.colorTheme'] = $Theme
$json['environment.visualExperience.editorAppearance'] = 'matchTheme'
$json | ConvertTo-Json -Depth 10 | Set-Content $settings

$proc = Start-Process $devenv -ArgumentList '/rootsuffix', $RootSuffix, "`"$langs\Fili.Langs.sln`"" -PassThru
Start-Sleep -Seconds $Wait
$proc.Refresh()
if ($proc.HasExited -or $proc.MainWindowHandle -eq 0) { throw 'the isolated Visual Studio has no window' }
$dte = $null
$major = (Get-Item $devenv).VersionInfo.FileMajorPart
for ($i = 0; $i -lt 30 -and -not $dte; $i++) { $dte = [FiliVs]::Rot("!VisualStudio.DTE.$major.0:$($proc.Id)"); if (-not $dte) { Start-Sleep -Seconds 1 } }
if (-not $dte) { CloseRef; throw "no DTE in the Running Object Table for process $($proc.Id)" }

$saved = New-Object FiliVs+POINT; [FiliVs]::GetCursorPos([ref]$saved) | Out-Null
try {
  switch ($Scenario) {
    'editor' {
      Retry { $dte.Debugger.Breakpoints } | ForEach-Object { Retry { $_.Delete() } }
      OpenActive $cs; Shot 'open'
      $sel = Retry { $dte.ActiveDocument.Selection }
      Retry { $sel.MoveToLineAndOffset(7, 13) }; Shot 'refs'
      Retry { $sel.MoveToLineAndOffset(10, 9) }; Shot 'brace'
      Retry { $sel.MoveToLineAndOffset(1, 1) }
      $bp = Retry { $dte.Debugger.Breakpoints.Add('', $cs, 8) }
      foreach ($b in @($bp)) { Retry { $b.Enabled = $false } }
      Shot 'bp-disabled'
      Retry { $dte.Solution.SolutionBuild.StartupProjects = 'Fili.Langs.Cli\Fili.Langs.Cli.csproj' }
      Retry { $dte.Debugger.Breakpoints.Add('', $cs, 23) } | Out-Null
      Retry { $dte.Debugger.Go($false) }
      for ($i = 0; $i -lt 120 -and (Retry { $dte.Debugger.CurrentMode }) -ne 2; $i++) { Start-Sleep -Seconds 1 }
      if ((Retry { $dte.Debugger.CurrentMode }) -ne 2) { throw 'the debugger never reached break mode' }
      Shot 'break'
      $frames = @(Retry { $dte.Debugger.CurrentThread.StackFrames })
      Retry { $dte.Debugger.CurrentStackFrame = $frames[1] }
      Shot 'caller'
      Retry { $dte.Debugger.Stop($true) }; Start-Sleep -Seconds 4
      Retry { $dte.Debugger.Breakpoints } | ForEach-Object { Retry { $_.Delete() } }
      OpenActive (Join-Path $langs 'Fili.Langs.Cli\NOTES.md'); Shot 'markdown'
      OpenActive $cs
      $sel = Retry { $dte.ActiveDocument.Selection }
      Retry { $sel.MoveToLineAndOffset(8, 22) }; Retry { $sel.MoveToLineAndOffset(8, 23, $true) }
      Front; Retry { $dte.ExecuteCommand('Edit.Find') }; Shot 'find'
    }
    'languages' {
      $files = [ordered]@{ vb = 'Fili.Langs.Vb\Program.vb'; ps1 = 'Fili.Langs.Cli\build.ps1'; razor = 'Fili.Langs.Web\Orders.razor'; json = 'Fili.Langs.Web\data.json'
        scss = 'Fili.Langs.Web\site.scss'; less = 'Fili.Langs.Web\site.less'; sql = 'Fili.Langs.Web\query.sql'; html = 'Fili.Langs.Web\index.html' }
      foreach ($k in $files.Keys) { OpenActive (Join-Path $langs $files[$k]); Start-Sleep -Seconds 8; Shot $k }
    }
    'snippet' {
      OpenActive $cs
      $sel = Retry { $dte.ActiveDocument.Selection }
      Retry { $sel.MoveToLineAndOffset(20, 1) }; Retry { $sel.Insert('    prop') }
      SendSafe '{TAB}{TAB}'; Shot 'snippet'; SendSafe '{ESC}'
    }
    'terminal' {
      Retry { $dte.ExecuteCommand('View.Terminal') }
      Start-Sleep -Seconds 20
      $cmd = '0..15 | ForEach-Object { $b = if ($_ -lt 8) { 40 + $_ } else { 92 + $_ }; Write-Host -NoNewline ("$([char]27)[" + $b + "m  " + $_.ToString().PadLeft(2) + "  $([char]27)[0m ") }; Write-Host'
      SendSafe ((Esc $cmd) + '{ENTER}'); Start-Sleep -Seconds 5; Shot 'terminal'
    }
    'diff' {
      Retry { $dte.ExecuteCommand('Tools.DiffFiles', ('"{0}" "{1}"' -f (Join-Path $langs 'left.txt'), (Join-Path $langs 'right.txt'))) }
      Shot 'diff'
    }
    'codelens' {
      OpenActive $cs; Start-Sleep -Seconds 12
      [FiliVs]::SetCursorPos(5, 5) | Out-Null
      Shot 'codelens-rest'
      # The CodeLens labels are grey (#A0A0A0-ish in Dark) in the left column; the lowest one is
      # "1 reference" above Weigh.
      $bmp = [System.Drawing.Bitmap]::FromFile((Join-Path $OutDir 'codelens-rest.png'))
      $rows = @(for ($y = 150; $y -lt $bmp.Height - 150; $y++) {
        $n = 0; for ($x = 80; $x -lt 200; $x++) { $c = $bmp.GetPixel($x, $y); if ([Math]::Abs($c.R - 160) -lt 14 -and [Math]::Abs($c.G - 160) -lt 14 -and [Math]::Abs($c.B - 160) -lt 14) { $n++ } }
        if ($n -ge 4) { $y }
      })
      $bmp.Dispose()
      if (-not $rows) { throw 'no CodeLens label found' }
      $w = New-Object FiliVs+RECT; [FiliVs]::GetWindowRect($proc.MainWindowHandle, [ref]$w) | Out-Null
      [FiliVs]::SetCursorPos($w.L + 147, $w.T + $rows[-1] - 2) | Out-Null
      Start-Sleep -Milliseconds 1500
      Shot 'codelens-hover'
    }
  }
} finally {
  [FiliVs]::SetCursorPos($saved.X, $saved.Y) | Out-Null
  CloseRef
}
