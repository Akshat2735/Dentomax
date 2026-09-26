param([string]$CataloguePath = "$PSScriptRoot\..\data\dentomax-academy-courses.json")

$ErrorActionPreference = 'Stop'
$catalogue = Get-Content -Raw -LiteralPath $CataloguePath | ConvertFrom-Json
$destination = Join-Path $PSScriptRoot '..\public\course-images'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
foreach ($course in $catalogue) {
  $extension = [IO.Path]::GetExtension(([uri]$course.featuredImage.url).AbsolutePath).ToLowerInvariant()
  if ($extension -eq '.jpeg') { $extension = '.jpg' }
  $target = Join-Path $destination ($course.slug + $extension)
  Invoke-WebRequest -Uri $course.featuredImage.url -OutFile $target -TimeoutSec 60
  Write-Output "Downloaded $($course.slug)$extension"
}
