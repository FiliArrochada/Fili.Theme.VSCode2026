param([string]$Src, [string]$Out, [int]$TopEnd = 835, [int]$BarStart = 1130, [int]$Width = 0)
# Stacks the window's upper part (title bar, editor, sidebar) on its status bar, dropping the panel
# in between, so no machine path from the terminal prompt ends up in the published screenshot.
Add-Type -AssemblyName System.Drawing
$s = [System.Drawing.Bitmap]::FromFile($Src)
$w = if ($Width) { $Width } else { $s.Width }
$barH = $s.Height - $BarStart - 8
$dst = New-Object System.Drawing.Bitmap $w, ($TopEnd + $barH)
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.DrawImage($s, (New-Object System.Drawing.Rectangle 0, 0, $w, $TopEnd), (New-Object System.Drawing.Rectangle 0, 0, $w, $TopEnd), [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawImage($s, (New-Object System.Drawing.Rectangle 0, $TopEnd, $w, $barH), (New-Object System.Drawing.Rectangle 0, $BarStart, $w, $barH), [System.Drawing.GraphicsUnit]::Pixel)
$dst.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png); $dst.Dispose(); $s.Dispose()
"saved $Out"
