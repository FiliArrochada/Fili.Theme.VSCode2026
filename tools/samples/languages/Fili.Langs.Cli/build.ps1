# Builds the solution and reports the result.
param([string]$Configuration = "Release")

$projects = Get-ChildItem -Path $PSScriptRoot -Filter *.csproj
foreach ($project in $projects) {
    $result = & dotnet build $project.FullName -c $Configuration
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed: $($project.Name)"
        exit 1
    }
}
Write-Host "Built $($projects.Count) project(s)" -ForegroundColor Green
