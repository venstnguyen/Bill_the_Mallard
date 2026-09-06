import * as path from 'path';
import { downloadAndUnzipVSCode, runTests } from '@vscode/test-electron';

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, './suite/index.js');
    const downloadedExecutable = await downloadAndUnzipVSCode();
    const vscodeExecutablePath = process.platform === 'darwin'
      ? downloadedExecutable.replace(/\/Electron$/, '/Code')
      : downloadedExecutable;

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      vscodeExecutablePath,
    });
  } catch (error) {
    console.error('Failed to run extension tests:', error);
    process.exit(1);
  }
}

main();
