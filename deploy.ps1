# อัปโหลดเว็บขึ้น Netlify (ลิงก์เดิม) — ใช้: ดับเบิลคลิก deploy.bat หรือรัน powershell -File deploy.ps1
# ครั้งแรกจะถาม Access Token แล้วเก็บไว้ที่ %USERPROFILE%\.netlify-token (ไม่ได้อยู่ในโฟลเดอร์เว็บ)
$ErrorActionPreference = "Stop"
$site = "posarin-portfolio.netlify.app"
$tokenFile = Join-Path $env:USERPROFILE ".netlify-token"
$root = $PSScriptRoot

if (-not (Test-Path $tokenFile)) {
  Write-Host "ยังไม่มี Netlify Access Token" -ForegroundColor Yellow
  Write-Host "สร้างได้ที่ https://app.netlify.com/user/applications#personal-access-tokens แล้ววางที่นี่"
  $sec = Read-Host "วาง Token แล้วกด Enter (ตัวอักษรจะไม่ขึ้นบนจอ)" -AsSecureString
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
  if (-not $plain.Trim()) { throw "ไม่ได้ใส่ Token" }
  Set-Content -Path $tokenFile -Value $plain.Trim() -Encoding ascii -NoNewline
  Write-Host "บันทึก Token แล้ว" -ForegroundColor Green
}
$token = (Get-Content $tokenFile -Raw).Trim()

# เอาเฉพาะไฟล์ที่เว็บใช้ (ไม่เอา PDF, สคริปต์นี้ หรือไฟล์อื่นในโฟลเดอร์)
$include = @("index.html", "style.css", "script.js", "card3d.js", "vendor\three.min.js", "favicon.svg", "favicon.png", "apple-touch-icon.png") +
  (Get-ChildItem "$root\shots" -File | ForEach-Object { "shots\" + $_.Name }) +
  (Get-ChildItem "$root\certs" -Filter *.png -File | ForEach-Object { "certs\" + $_.Name }) +
  (Get-ChildItem "$root\downloads" -File -ErrorAction SilentlyContinue | ForEach-Object { "downloads\" + $_.Name })

# สร้าง zip เอง เพราะ Compress-Archive ของ Windows PowerShell ใส่ \ ในชื่อโฟลเดอร์ ซึ่ง Netlify ไม่อ่านเป็นโฟลเดอร์
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$zip = Join-Path $env:TEMP "netlify-deploy.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
$archive = [System.IO.Compression.ZipFile]::Open($zip, "Create")
try {
  foreach ($rel in $include) {
    $entry = $rel -replace "\\", "/"
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $root $rel), $entry)
  }
} finally { $archive.Dispose() }
Write-Host "กำลังอัปโหลด $($include.Count) ไฟล์..."

$res = curl.exe -s -w "`n%{http_code}" -X POST "https://api.netlify.com/api/v1/sites/$site/deploys" `
  -H "Authorization: Bearer $token" -H "Content-Type: application/zip" --data-binary "@$zip"
$code = ($res -split "`n")[-1]
if ($code -notmatch "^2") {
  Write-Host "อัปโหลดไม่สำเร็จ (HTTP $code)" -ForegroundColor Red
  if ($code -eq "401") { Write-Host "Token ใช้ไม่ได้ ลบไฟล์ $tokenFile แล้วรันใหม่เพื่อใส่ Token ใหม่" }
  exit 1
}
Write-Host "อัปเดตแล้ว: https://$site" -ForegroundColor Green
