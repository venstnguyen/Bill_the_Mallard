import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const provider = new BillViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'billMallardView',
      provider
    )
  );

  // Command: Index Repository
  context.subscriptions.push(vscode.commands.registerCommand('bill.indexRepository', async () => {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) { return vscode.window.showErrorMessage("No workspace open!"); }
    const rootPath = folders[0].uri.fsPath;

    vscode.window.showInformationMessage("Bill: Indexing repository... 🦆");
    try {
      const res = await fetch('http://127.0.0.1:8000/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root_path: rootPath })
      });
      const data = await res.json();
      vscode.window.showInformationMessage(`Bill: Indexed ${data.files_indexed} files.`);
    } catch (e) {
      vscode.window.showErrorMessage(`Bill: Indexing failed. Is backend running?`);
    }
  }));

  // Command: Analyze File
  context.subscriptions.push(vscode.commands.registerCommand('bill.analyzeFile', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return vscode.window.showErrorMessage("No active file!"); }

    const content = editor.document.getText();
    const filename = editor.document.fileName;

    vscode.window.showInformationMessage("Bill: Analyzing for refactors... 🦆");
    try {
      const res = await fetch('http://127.0.0.1:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_content: content, filename: filename })
      });
      const data = await res.json();

      // Show in a new document or output channel (using untitled doc for visibility)
      const doc = await vscode.workspace.openTextDocument({
        content: `Refactor Plan for ${filename}\nLines: ${data.metrics.lines}\n\n${data.plan}`,
        language: 'markdown'
      });
      await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside });

    } catch (e) {
      vscode.window.showErrorMessage(`Bill: Analysis failed.`);
    }
  }));

  // Command: Dev Diary
  context.subscriptions.push(vscode.commands.registerCommand('bill.devDiary', async () => {
    // Naive approach: try to get last 5 commits via git CLI (requires git in path)
    // In a real extension, use 'vscode.git' extension API or simple-git
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) return;
    const cwd = folders[0].uri.fsPath;

    const cp = require('child_process');
    cp.exec('git log -n 5 --pretty=format:"%s"', { cwd }, async (err: any, stdout: string) => {
      if (err) { return vscode.window.showErrorMessage("Bill: Could not read git log."); }
      const commits = stdout.split('\n');

      vscode.window.showInformationMessage("Bill: Writing Dev Diary... 🦆");
      try {
        const res = await fetch('http://127.0.0.1:8000/summarize_commits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commits: commits })
        });
        const data = await res.json();

        const doc = await vscode.workspace.openTextDocument({
          content: `# Dev Diary 🦆\n\n${data.post}`,
          language: 'markdown'
        });
        await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside });

      } catch (e) {
        vscode.window.showErrorMessage(`Bill: Diary generation failed.`);
      }
    });
  }));
}

export function deactivate() { }

class BillViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly extensionUri: vscode.Uri) { }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
  ) {
    const webview = webviewView.webview;
    webview.options = {
      enableScripts: true,
    };

    webview.html = this.getHtmlForWebview(webview);

    webview.onDidReceiveMessage(message => {
      if (message.type === 'userMessage') {
        const text = message.text as string;

        // Get active editor context
        const editor = vscode.window.activeTextEditor;
        let contextMsg = "";
        let analysis = "";

        if (editor) {
          const doc = editor.document;
          const lang = doc.languageId;
          const filename = doc.fileName.split('/').pop(); // simplistic approach
          contextMsg = `[Reading ${filename} (${lang})]`;

          // Heuristic analysis removed. Chat is handled by the webview calling the backend directly.
          // We still send context info for the UI to show what file is active.

        } else {
          contextMsg = "[No active editor]";
        }

        webview.postMessage({
          type: 'contextInfo',
          text: contextMsg
        });
      }
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: sans-serif; padding: 10px; color: var(--vscode-foreground); }
          #messages { height: 220px; overflow-y: auto; border: 1px solid var(--vscode-editorWidget-border); padding: 8px; margin-bottom: 8px; }
          #inputRow { display: flex; gap: 4px; }
          #input { flex: 1; }
          h2 { margin-top: 0; }
          .system-msg { font-size: 0.8em; color: var(--vscode-descriptionForeground); margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <h2>Bill the Mallard 🦆</h2>
        <div id="messages">
          <div><strong>Bill:</strong> Quack! I’m Bill, your coding buddy. I can see what you're working on!</div>
        </div>
        <div id="inputRow">
          <input id="input" type="text" placeholder="Ask Bill something..." />
          <button id="send">Send</button>
        </div>
        <script>
          const vscode = acquireVsCodeApi();
          const messagesDiv = document.getElementById('messages');
          const input = document.getElementById('input');
          const sendBtn = document.getElementById('send');

          function addMessage(sender, text, isSystem = false) {
            const div = document.createElement('div');
            if (isSystem) {
              div.className = 'system-msg';
              div.textContent = text;
            } else {
              div.innerHTML = '<strong>' + sender + ':</strong> ' + text;
            }
            messagesDiv.appendChild(div);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
          }

          sendBtn.addEventListener('click', async () => {
             const text = input.value.trim();
             if (!text) return;
             
             addMessage('You', text);
             input.value = '';
             
             // Send to Extension Host for context (optional, but good for tracking)
             vscode.postMessage({ type: 'userMessage', text });

             // Call Local Backend
             try {
                const response = await fetch('http://127.0.0.1:8000/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text })
                });
                const data = await response.json();
                addMessage('Bill', data.reply);
             } catch (err) {
                addMessage('Bill', 'Quack! I cannot reach my brain (backend). Is the server running?');
                console.error(err);
             }
          });

          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              sendBtn.click();
            }
          });

          window.addEventListener('message', event => {
            const msg = event.data;
             if (msg.type === 'contextInfo') {
              addMessage('', msg.text, true);
            }
          });
        </script>
      </body>
      </html>
    `;
  }
}