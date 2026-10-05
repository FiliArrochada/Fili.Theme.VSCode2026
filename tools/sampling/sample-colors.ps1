param([string]$Image, [string[]]$Boxes)
# Each box is name:x0:x1:yCenter. Reports the glyph-core colour: among the pixels that differ from
# the box's most common colour (the background), the most common of the farthest fifth.
Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile($Image)
foreach ($box in $Boxes) {
  $name, $x0, $x1, $yc = $box -split ':'; $x0 = [int]$x0; $x1 = [int]$x1; $y0 = [int]$yc - 6; $y1 = [int]$yc + 6
  $h = @{}; $px = New-Object System.Collections.Generic.List[object]
  for ($x = $x0; $x -lt $x1; $x++) { for ($y = $y0; $y -lt $y1; $y++) { $c = $b.GetPixel($x, $y); $h['{0},{1},{2}' -f $c.R, $c.G, $c.B]++; $px.Add($c) } }
  $bgR, $bgG, $bgB = (($h.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 1).Key -split ',') | ForEach-Object { [int]$_ }
  $scored = $px | Where-Object { -not ($_.R -eq $bgR -and $_.G -eq $bgG -and $_.B -eq $bgB) } |
    ForEach-Object { [pscustomobject]@{ c = $_; d = [Math]::Abs($_.R - $bgR) + [Math]::Abs($_.G - $bgG) + [Math]::Abs($_.B - $bgB) } } | Sort-Object d -Descending
  $top = $scored | Select-Object -First ([Math]::Max(3, [int]($scored.Count / 5)))
  $core = ($top | Group-Object { '#{0:X2}{1:X2}{2:X2}' -f $_.c.R, $_.c.G, $_.c.B } | Sort-Object Count -Descending | Select-Object -First 1).Name
  "{0,-18} {1}   (bg #{2:X2}{3:X2}{4:X2})" -f $name, $core, $bgR, $bgG, $bgB
}
$b.Dispose()
