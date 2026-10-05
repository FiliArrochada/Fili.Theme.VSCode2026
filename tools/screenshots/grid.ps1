param([string]$Out, [string[]]$Images, [string[]]$Labels, [int]$Cols = 3, [int]$CellW = 640, [int]$CropH = 835, [string]$Bg = '#1C1C1C', [string]$Fg = '#FAFAFA')
# Lays captures out in a labelled grid. Each capture is cropped to its top $CropH pixels (title bar,
# editor, side bar — above the panel, so no terminal prompt or machine path is included).
Add-Type -AssemblyName System.Drawing
$first = [System.Drawing.Bitmap]::FromFile($Images[0]); $srcW = $first.Width; $first.Dispose()
$cellH = [int]($CellW * $CropH / $srcW); $labelH = 30; $pad = 12
$rows = [Math]::Ceiling($Images.Count / $Cols)
$W = $Cols * $CellW + ($Cols + 1) * $pad; $H = $rows * ($cellH + $labelH) + ($rows + 1) * $pad
$dst = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear([System.Drawing.ColorTranslator]::FromHtml($Bg))
$font = New-Object System.Drawing.Font 'Segoe UI', 11
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($Fg))
for ($i = 0; $i -lt $Images.Count; $i++) {
  $x = $pad + ($i % $Cols) * ($CellW + $pad); $y = $pad + [Math]::Floor($i / $Cols) * ($cellH + $labelH + $pad)
  $src = [System.Drawing.Bitmap]::FromFile($Images[$i])
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle $x, $y, $CellW, $cellH), (New-Object System.Drawing.Rectangle 0, 0, $src.Width, $CropH), [System.Drawing.GraphicsUnit]::Pixel)
  $src.Dispose()
  $g.DrawString($Labels[$i], $font, $brush, [float]$x, [float]($y + $cellH + 4))
}
$dst.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png); $dst.Dispose(); $g.Dispose()
"saved $Out ${W}x${H}"
