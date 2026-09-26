/**
 * Attach to the already-running Chrome profile.
 * Chrome 136+ refuses --remote-debugging-port on the default user-data dir, and
 * app-bound cookies do not decrypt in a copied profile. The supported path is
 * chrome://inspect/#remote-debugging (Chrome 144+), which writes DevToolsActivePort.
 */
import { execFile, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const CHROME_USER_DATA = join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'User Data');

export function readDevToolsEndpoint() {
  const portFile = join(CHROME_USER_DATA, 'DevToolsActivePort');
  let text;
  try {
    text = readFileSync(portFile, 'utf8');
  } catch {
    return null;
  }
  const [rawPort, rawPath] = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const port = Number(rawPort);
  if (!rawPath || !Number.isInteger(port) || port <= 0) return null;
  return `ws://127.0.0.1:${port}${rawPath}`;
}

export async function openRemoteDebuggingSettings() {
  const { stdout } = await execFileAsync('powershell', [
    '-NoProfile',
    '-Command',
    "(Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe').'(default)'",
  ]);
  const exe = stdout.trim();
  if (!exe) throw new Error('Chrome executable not found');
  const child = spawn(exe, ['chrome://inspect/#remote-debugging'], { detached: true, stdio: 'ignore' });
  child.unref();
}

export async function closeChrome() {
  const script = `
    $ErrorActionPreference = 'SilentlyContinue'
    Get-Process chrome | ForEach-Object { $_.CloseMainWindow() | Out-Null }
    $deadline = (Get-Date).AddSeconds(12)
    while ((Get-Process chrome) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 400 }
    Get-Process chrome | Stop-Process -Force
    exit 0
  `;
  await execFileAsync('powershell', ['-NoProfile', '-Command', script]);
}

export async function relaunchChromeNormal() {
  const { stdout } = await execFileAsync('powershell', [
    '-NoProfile',
    '-Command',
    "(Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe').'(default)'",
  ]);
  const exe = stdout.trim();
  await closeChrome();
  const child = spawn(exe, ['--no-first-run', '--no-default-browser-check'], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}
