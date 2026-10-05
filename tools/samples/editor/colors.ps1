$PSStyle.OutputRendering = 'Ansi'
$e = [char]27
foreach ($row in @(30..37), @(90..97), @(40..47)) {
    foreach ($c in $row) { Write-Host -NoNewline ("{0}[{1}m ansi{1} {0}[0m" -f $e, $c) }
    Write-Host ''
}
Write-Host ("$($PSStyle.Foreground.Red)PSStyle red$($PSStyle.Reset)  OutputRendering={0}  TERM_PROGRAM={1}" -f $PSStyle.OutputRendering, $env:TERM_PROGRAM)
