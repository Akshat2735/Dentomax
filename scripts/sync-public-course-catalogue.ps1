param(
  [string]$OutputPath = "$PSScriptRoot\..\data\dentomax-academy-courses.json"
)

$ErrorActionPreference = 'Stop'
$products = Invoke-RestMethod -Uri 'https://dentomaxacademy.org/wp-json/wp/v2/product?per_page=100&_embed=1' -TimeoutSec 60
$categories = Invoke-RestMethod -Uri 'https://dentomaxacademy.org/wp-json/wp/v2/product_cat?per_page=100' -TimeoutSec 60
$storeProducts = Invoke-RestMethod -Uri 'https://dentomaxacademy.org/wp-json/wc/store/v1/products?per_page=100' -TimeoutSec 60
$categoryById = @{}
$categories | ForEach-Object { $categoryById[[string]$_.id] = [System.Web.HttpUtility]::HtmlDecode($_.name) }
$priceByProductId = @{}
$storeProducts | ForEach-Object { $priceByProductId[[string]$_.id] = $_.prices }

function Decode([string]$value) { return [System.Web.HttpUtility]::HtmlDecode($value) }
function PlainText([string]$value) {
  $plain = $value -replace '(?is)<script.*?</script>', ' ' -replace '(?is)<style.*?</style>', ' ' -replace '<[^>]+>', ' ' -replace '\[(?:/?)(?:vc|stm|elementor)[^\]]*\]', ' ' -replace '\s+', ' '
  return (Decode $plain).Trim()
}
function Items([string]$html) {
  return @([regex]::Matches($html, '(?is)<li[^>]*>(.*?)</li>') | ForEach-Object { PlainText $_.Groups[1].Value } | Where-Object { $_ })
}

$catalogue = foreach ($product in $products) {
  $media = $product.'_embedded'.'wp:featuredmedia'[0]
  $html = [string]$product.content.rendered
  $plain = PlainText $html
  $headings = @([regex]::Matches($html, '(?is)<h[1-6][^>]*>(.*?)</h[1-6]>') | ForEach-Object { PlainText $_.Groups[1].Value } | Where-Object { $_ } | Select-Object -Unique)
  $textSections = @([regex]::Matches($html, '(?is)<(?:strong|b)[^>]*>(.*?)</(?:strong|b)>') | ForEach-Object { PlainText $_.Groups[1].Value } | Where-Object { $_ -and $_.Length -lt 180 } | Select-Object -Unique)
  $allItems = Items $html
  $price = $priceByProductId[[string]$product.id]
  $eligibility = $null
  if ($plain -match '(?is)Eligibility Criteria\s+(.+?)(?=\s+(?:Skin Anatomy|Course Description|Comprehensive Curriculum|What is|Overview)|$)') { $eligibility = $Matches[1].Trim() }
  [PSCustomObject]@{
    sourceId = $product.id
    slug = $product.slug
    title = Decode $product.title.rendered
    category = $categoryById[[string]$product.product_cat[0]]
    sourceUrl = $product.link
    sourceVerifiedAt = (Get-Date).ToUniversalTime().ToString('o')
    excerptHtml = $product.excerpt.rendered
    contentHtml = $html
    fullPublicText = $plain
    headings = $headings
    emphasizedHeadings = $textSections
    curriculumItems = $allItems
    eligibilitySourceText = $eligibility
    price = if ($price) { [PSCustomObject]@{
      amount = $price.price
      regularAmount = $price.regular_price
      saleAmount = $price.sale_price
      currency = $price.currency_code
      currencySymbol = $price.currency_symbol
      minorUnit = $price.currency_minor_unit
      isOnSale = $price.sale_price -ne $price.regular_price
    } } else { $null }
    tags = @($product.product_tag)
    featuredImage = [PSCustomObject]@{ url = $media.source_url; alt = $media.alt_text; captionHtml = $media.caption.rendered }
    additionalSections = @()
    inaccessible = [PSCustomObject]@{ instructors = $true; pricing = $false; faqs = $true; relatedCourses = $true; privateLessons = $true }
  }
}

$parent = Split-Path -Parent $OutputPath
if (!(Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent | Out-Null }
$catalogue | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $OutputPath -Encoding utf8
$summaryPath = Join-Path (Split-Path -Parent $OutputPath) 'dentomax-academy-course-summaries.json'
$catalogue | ForEach-Object {
  [PSCustomObject]@{
    slug = $_.slug
    title = $_.title
    category = $_.category
    shortDescription = (PlainText $_.excerptHtml)
    price = $_.price
    durationClaims = @([regex]::Matches($_.fullPublicText, '(?i)(?:Duration\s*:\s*)?(?:\d+\s*(?:day|days|week|weeks|month|months|year|years)|one year|two years)') | ForEach-Object Value | Select-Object -Unique)
    searchText = "$($_.title) $($_.category) $($_.fullPublicText) $($_.curriculumItems -join ' ')"
    imagePath = "/course-images/$($_.slug)$(([IO.Path]::GetExtension(([uri]$_.featuredImage.url).AbsolutePath).ToLowerInvariant()).Replace('.jpeg','.jpg'))"
    imageAlt = $_.featuredImage.alt
  }
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $summaryPath -Encoding utf8
Write-Output "Wrote $($catalogue.Count) public courses to $OutputPath"
