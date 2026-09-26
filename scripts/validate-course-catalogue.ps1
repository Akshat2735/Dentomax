$ErrorActionPreference = 'Stop'
$catalogue = Get-Content -Raw "$PSScriptRoot\..\data\dentomax-academy-courses.json" | ConvertFrom-Json
$errors = @()
if ($catalogue.Count -ne 16) { $errors += "Expected 16 courses; found $($catalogue.Count)." }
$duplicateSlugs = $catalogue | Group-Object slug | Where-Object Count -gt 1
if ($duplicateSlugs) { $errors += "Duplicate slugs: $($duplicateSlugs.Name -join ', ')" }
foreach ($course in $catalogue) {
  if (!$course.title -or !$course.slug -or !$course.sourceUrl) { $errors += "Missing identity/source URL: $($course.slug)" }
  if (!$course.fullPublicText -or !$course.contentHtml) { $errors += "Missing complete public content: $($course.slug)" }
  if (!$course.curriculumItems -or $course.curriculumItems.Count -eq 0) { $errors += "Missing curriculum list: $($course.slug)" }
  $extension = [IO.Path]::GetExtension(([uri]$course.featuredImage.url).AbsolutePath).ToLowerInvariant().Replace('.jpeg','.jpg')
  $image = Join-Path "$PSScriptRoot\..\public\course-images" ($course.slug + $extension)
  if (!(Test-Path -LiteralPath $image)) { $errors += "Missing local image: $($course.slug)" }
}
if ($errors.Count) { $errors | ForEach-Object { Write-Error $_ }; exit 1 }
Write-Output "Validated $($catalogue.Count) courses: unique slugs, source URLs, complete public content, curriculum lists, and local images are present."
