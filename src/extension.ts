// extension.ts
import * as vscode from 'vscode'
import { getHoveredWord, resolveHoveredWord } from './resolver/resolver'
import { initScanner } from './sources/tw'

export async function activate(context: vscode.ExtensionContext) {
    const { getMap, watcher } = await initScanner()
    context.subscriptions.push(watcher)

    const cssMap = getMap()

    const hover = vscode.languages.registerHoverProvider(
        [
            { language: 'typescriptreact', scheme: 'file' },
            { language: 'html', scheme: 'file' },
        ],
        {
            async provideHover(document, position) {
                const word = getHoveredWord(document, position)
                if (!word) {
                    return new vscode.Hover('')
                }

                const output = resolveHoveredWord(word, cssMap)

                const md = new vscode.MarkdownString()
                if (output) {
                    md.appendMarkdown(`🎨 **Custom token**\n\n`)
                    md.appendCodeblock(output, 'css')
                }

                return new vscode.Hover(md)
            },
        }
    )

    context.subscriptions.push(hover)
}
/* istanbul ignore next */
export function deactivate() {}
