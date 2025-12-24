import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const provider = new BillViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'billMallardView',
      provider
    )
  );
}

export function deactivate() {}

class BillViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly extensionUri: vscode.Uri) {}

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
        webview.postMessage({
          type: 'billMessage',
          text: `Quack! You said: "${text}". Soon I’ll understand your whole repo.`
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
        </style>
      </head>
      <body>
        <h2>Bill the Mallard 🦆</h2>
        <div id="messages">
          <div><strong>Bill:</strong> Quack! I’m Bill, your coding buddy.</div>
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

          function addMessage(sender, text) {
            const div = document.createElement('div');
            div.innerHTML = '<strong>' + sender + ':</strong> ' + text;
            messagesDiv.appendChild(div);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
          }

          sendBtn.addEventListener('click', () => {
            const text = input.value.trim();
            if (!text) return;
            addMessage('You', text);
            vscode.postMessage({ type: 'userMessage', text });
            input.value = '';
          });

          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              sendBtn.click();
            }
          });

          window.addEventListener('message', event => {
            const msg = event.data;
            if (msg.type === 'billMessage') {
              addMessage('Bill', msg.text);
            }
          });
        </script>
      </body>
      </html>
    `;
  }
}