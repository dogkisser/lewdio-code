import * as vscode from 'vscode';
import * as https from 'https';

var interval: any;
var panel: vscode.WebviewPanel;
var curImgPath: string;
var curImgBytes: Uint8Array;

export const activate = (context: vscode.ExtensionContext) => {
  const openPanelCmd = vscode.commands.registerCommand('lewdio-code.openPanel', createPanel);
  const checkCmd = vscode.commands.registerCommand('lewdio-code.check', checkWalltaker);
  vscode.workspace.onDidChangeConfiguration(updateInterval);

  createPanel();

  context.subscriptions.push(openPanelCmd);
  context.subscriptions.push(checkCmd);
};

const updateInterval = () => {
  clearInterval(interval);
  interval = setInterval(checkWalltaker,
    (vscode.workspace.getConfiguration('lewdio-code').get('interval') as number) * 1000);
};

const createPanel = () => {
  // Shh
  try { panel.dispose(); } catch { }
  panel = vscode.window.createWebviewPanel(
    'lewdio-code-panel',
    'Lewdio Code',
    { preserveFocus: true, viewColumn: vscode.ViewColumn.Two },
    { }
  );

  updateInterval();
  checkWalltaker();
};

const checkWalltaker = () => {
  const link = (vscode.workspace.getConfiguration('lewdio-code').get('link') as number);
  const openOnNew =
    (vscode.workspace.getConfiguration('lewdio-code').get('openOnNewWallpaper') as boolean);

  getUrlBytes(`https://walltaker.joi.how/api/links/${link}.json`)
    .then(response => {
        const result = JSON.parse(response.toString());
        console.log(`Checked ${link} and got ${result.post_url}`);
        /* Short-circuit if the image hasn't changed */
        if (result.post_url != curImgPath) {
          getUrlBytes(result.post_url).then((b) => {
            curImgBytes = b;
            curImgPath = result.post_url;
  
            if (openOnNew) {
              createPanel();
            }
          });
        }

        panel.webview.html = `
          <!DOCTYPE html>
          <html><body style="height: 100vh; width: 100vw;">
          <img
            style="max-height: 100vh; max-width: 100vw; width: auto; height: auto"
            src="${'data:image/png;base64,' + Buffer.from(curImgBytes).toString('base64')}"
          />
          </body></html>
        `;
      })
    .catch((error) => vscode.window.showErrorMessage(error));
};

export const getUrlBytes = (to: string): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    const data: Uint8Array[] = [];

    https.get(to, (res) => {
      res.on('data', fragment => data.push(fragment));
      res.on('end', () => resolve(Buffer.concat(data)));
      res.on('error', (error) => reject(error));
    });
  });
};
