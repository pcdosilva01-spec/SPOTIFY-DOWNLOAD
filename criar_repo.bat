@echo off
title Criar Repositorio GitHub

echo.
echo === Criar Repositorio no GitHub ===
echo.

:: Verificar Git
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Git nao encontrado. Instale em https://git-scm.com
    pause & exit /b 1
)

:: Verificar GitHub CLI
gh --version >nul 2>&1
if errorlevel 1 (
    echo [INFO] GitHub CLI nao encontrado. Baixando instalador...

    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cli/cli/releases/download/v2.50.0/gh_2.50.0_windows_amd64.msi' -OutFile '%TEMP%\gh_installer.msi'"

    if not exist "%TEMP%\gh_installer.msi" (
        echo [ERRO] Falha ao baixar. Verifique sua conexao.
        echo        Baixe manualmente em https://cli.github.com
        pause & exit /b 1
    )

    echo [INFO] Instalando GitHub CLI...
    msiexec /i "%TEMP%\gh_installer.msi" /quiet /norestart

    echo [OK] GitHub CLI instalado.
    echo      Feche este terminal e abra o .bat novamente.
    pause & exit /b 0
)

:: Login no GitHub
gh auth status >nul 2>&1
if errorlevel 1 (
    echo [INFO] Fazendo login no GitHub...
    gh auth login
)

:: Nome do repositorio
set /p REPO_NAME="Nome do repositorio (Enter para spotify-downloader): "
if "%REPO_NAME%"=="" set REPO_NAME=spotify-downloader

set /p PRIVADO="Repositorio privado? (s/N): "
set VISIBILITY=--public
if /i "%PRIVADO%"=="s" set VISIBILITY=--private

:: Inicializar Git local
if not exist ".git" (
    echo [INFO] Inicializando repositorio local...
    git init
    git branch -M main
)

:: Criar .gitignore se nao existir
if not exist ".gitignore" (
    echo .env> .gitignore
    echo *.mp3>> .gitignore
    echo *.zip>> .gitignore
    echo __pycache__/>> .gitignore
    echo *.pyc>> .gitignore
)

:: Commit inicial
git add .
git commit -m "first commit" >nul 2>&1

:: Criar repositorio no GitHub e push
echo [INFO] Criando repositorio '%REPO_NAME%' no GitHub...
gh repo create %REPO_NAME% %VISIBILITY% --source=. --remote=origin --push

if errorlevel 1 (
    echo [ERRO] Falha ao criar o repositorio.
) else (
    echo.
    echo [OK] Repositorio criado com sucesso!
    echo.
    gh repo view --web
)

pause
