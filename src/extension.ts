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

          // Heuristic analysis
          if (text.toLowerCase().includes('hello') || text.toLowerCase().includes('hi')) {
            analysis = "Quack! Hello there! I see you're coding.";
          } else if (lang === 'typescript' || lang === 'javascript') {
            analysis = "Quack! I like strict types! Make sure to check for nulls.";
          } else if (lang === 'python') {
            analysis = "Quack! Indentation is key!";
          } else {
            analysis = `Quack! I see you are working with ${lang}.`;
          }

        } else {
          contextMsg = "[No active editor]";
          analysis = "Quack! Open a file so I can help!";
        }

        webview.postMessage({
          type: 'contextInfo',
          text: contextMsg
        });

        webview.postMessage({
          type: 'billMessage',
          text: `${analysis} You said: "${text}".`
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
            } else if (msg.type === 'contextInfo') {
              addMessage('', msg.text, true);
            }
          });
        </script>
      </body>
      </html>
    `;
  }
}