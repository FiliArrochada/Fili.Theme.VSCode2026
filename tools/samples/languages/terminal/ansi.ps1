$PSStyle.OutputRendering = [System.Management.Automation.OutputRendering]::Ansi
0..15 | ForEach-Object {
    $b = if ($_ -lt 8) { 40 + $_ } else { 92 + $_ }
    Write-Host -NoNewline ("$([char]27)[" + $b + 'm  ' + $_.ToString().PadLeft(2) + "  $([char]27)[0m ")
}
Write-Host
