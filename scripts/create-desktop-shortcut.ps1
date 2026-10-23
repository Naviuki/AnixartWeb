$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "AniX (локально).lnk"
$target = Join-Path $repo "start-local.cmd"
$icon = Join-Path $repo "app\favicon.ico"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $target
$shortcut.WorkingDirectory = $repo
$shortcut.Description = "Запуск полностью рабочей локальной версии сайта AniX: ваш ПК сам служит сервером и прокси к API Anixart"
if (Test-Path $icon) { $shortcut.IconLocation = "$icon,0" }
$shortcut.Save()

Write-Host "Ярлык создан: $shortcutPath"
Write-Host "Цель: $target"
