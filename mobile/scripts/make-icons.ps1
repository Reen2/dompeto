Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $root '..\assets\images'
$out = (Resolve-Path $out).Path

$ivory = [System.Drawing.ColorTranslator]::FromHtml('#FAF8F4')
$ivoryDeep = [System.Drawing.ColorTranslator]::FromHtml('#F0E8D8')
$gold = [System.Drawing.ColorTranslator]::FromHtml('#A8813C')
$goldLight = [System.Drawing.ColorTranslator]::FromHtml('#D8B26A')
$charcoal = [System.Drawing.ColorTranslator]::FromHtml('#0C0C0D')

function New-Canvas([int]$size, [bool]$transparent) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  if ($transparent) {
    $g.Clear([System.Drawing.Color]::Transparent)
  } else {
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $ivory, $ivoryDeep, 90.0)
    $g.FillRectangle($brush, $rect)
    $brush.Dispose()
  }
  return @{ Bitmap = $bmp; Graphics = $g }
}

function Draw-Mark($g, [int]$size, $ringColor, $letterColor, [double]$scale = 1.0) {
  $c = $size / 2.0
  $r = ($size * 0.335) * $scale
  $penWidth = [Math]::Max(2.0, $size * 0.012 * $scale)
  $pen = New-Object System.Drawing.Pen($ringColor, [single]$penWidth)
  $g.DrawEllipse($pen, [single]($c - $r), [single]($c - $r), [single]($r * 2), [single]($r * 2))
  $pen.Dispose()

  $fontSize = [single]($size * 0.44 * $scale)
  $family = New-Object System.Drawing.FontFamily('Georgia')
  $style = [System.Drawing.FontStyle]::Bold
  $font = New-Object System.Drawing.Font($family, $fontSize, $style, [System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF(0, 0, [single]$size, [single]$size)
  $brush = New-Object System.Drawing.SolidBrush($letterColor)
  $g.DrawString('D', $font, $brush, $rect, $fmt)
  $brush.Dispose()
  $fmt.Dispose()
  $font.Dispose()
  $family.Dispose()
}

function Save-Png($canvas, [string]$path) {
  $canvas.Graphics.Dispose()
  $canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Bitmap.Dispose()
}

# App Store icons must not carry an alpha channel at all, so flatten onto a
# fresh 24bpp bitmap instead of saving the ARGB one.
function Save-PngOpaque($canvas, [string]$path, $background) {
  $canvas.Graphics.Dispose()
  $flat = New-Object System.Drawing.Bitmap($canvas.Bitmap.Width, $canvas.Bitmap.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($flat)
  $g.Clear($background)
  $g.DrawImageUnscaled($canvas.Bitmap, 0, 0)
  $g.Dispose()
  $flat.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $flat.Dispose()
  $canvas.Bitmap.Dispose()
}

# App icon: opaque, ivory -> warm ivory gradient, gold ring + serif D.
$canvas = New-Canvas 1024 $false
Draw-Mark $canvas.Graphics 1024 $gold $gold
Save-PngOpaque $canvas (Join-Path $out 'icon.png') $ivory

# Splash mark: transparent, drawn on the splash background colour.
$canvas = New-Canvas 1024 $true
Draw-Mark $canvas.Graphics 1024 $gold $gold
Save-Png $canvas (Join-Path $out 'splash-icon.png')

# Android adaptive foreground: art must stay inside the 66% safe zone.
$canvas = New-Canvas 1024 $true
Draw-Mark $canvas.Graphics 1024 $gold $gold 0.62
Save-Png $canvas (Join-Path $out 'android-icon-foreground.png')

# Android monochrome (themed icons): solid white silhouette.
$canvas = New-Canvas 1024 $true
Draw-Mark $canvas.Graphics 1024 ([System.Drawing.Color]::White) ([System.Drawing.Color]::White) 0.62
Save-Png $canvas (Join-Path $out 'android-icon-monochrome.png')

# Android background layer.
$canvas = New-Canvas 1024 $false
Save-PngOpaque $canvas (Join-Path $out 'android-icon-background.png') $ivory

# Favicon.
$canvas = New-Canvas 64 $false
Draw-Mark $canvas.Graphics 64 $gold $gold
Save-PngOpaque $canvas (Join-Path $out 'favicon.png') $ivory

# Dark-mode splash mark for the charcoal background.
$canvas = New-Canvas 1024 $true
Draw-Mark $canvas.Graphics 1024 $goldLight $goldLight
Save-Png $canvas (Join-Path $out 'splash-icon-dark.png')

Write-Output 'Icons written.'
