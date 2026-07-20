import { activate } from '../extension'
import * as vscode from 'vscode'

jest.mock('../resolver/resolver', () => ({
    ...jest.requireActual,
    getHoveredWord: jest.fn(),
    resolveHoveredWord: jest.fn(),
}))
jest.mock('../sources/tw', () => ({
    initScanner: jest.fn().mockResolvedValue({
        getMap: jest.fn().mockReturnValue([]),
        watcher: { dispose: jest.fn() },
    }),
}))

import { getHoveredWord, resolveHoveredWord } from '../resolver/resolver'

describe('extension', () => {
    let position: vscode.Position
    let document: vscode.TextDocument
    beforeEach(() => {
        position = { line: 2, character: 4 } as unknown as vscode.Position
        document = {
            getWordRangeAtPosition: jest.fn(),
            getText: jest.fn(),
        } as unknown as vscode.TextDocument
    })
    it('registers hover provider', async () => {
        const context = { subscriptions: [] } as any
        await activate(context)

        expect(vscode.languages.registerHoverProvider).toHaveBeenCalled()
        expect(context.subscriptions.length).toBeGreaterThan(0)
    })
    it('provideHover returns resolved output', async () => {
        const registerSpy = jest.spyOn(
            vscode.languages,
            'registerHoverProvider'
        )

        const context = { subscriptions: [] } as any

        await activate(context)

        const [, providerImpl] = registerSpy.mock.calls[0]

        ;(getHoveredWord as jest.Mock).mockReturnValue({
            prefix: 'color',
            token: 'primary',
        })
        ;(resolveHoveredWord as jest.Mock).mockReturnValue(
            '.color-primary { color: red; }'
        )
        const token = {
            isCancellationRequested: false,
            onCancellationRequested: jest.fn(),
        } as vscode.CancellationToken

        const hover = await providerImpl.provideHover(document, position, token)

        expect(hover?.contents).toBeDefined()
        expect(hover?.contents).toEqual({
            appendCodeblock: expect.any(Function),
            appendMarkdown: expect.any(Function),
        })
    })
    it('provideHover returns resolved output for falsy word', async () => {
        const registerSpy = jest.spyOn(
            vscode.languages,
            'registerHoverProvider'
        )

        const context = { subscriptions: [] } as any

        await activate(context)

        const [, providerImpl] = registerSpy.mock.calls[0]

        ;(getHoveredWord as jest.Mock).mockReturnValue('')
        ;(resolveHoveredWord as jest.Mock).mockReturnValue('')

        const token = {
            isCancellationRequested: false,
            onCancellationRequested: jest.fn(),
        } as vscode.CancellationToken

        const hover = await providerImpl.provideHover(document, position, token)

        expect(hover?.contents).toEqual('')
    })
    it('provideHover shouldnt call appendCodeblock and appendMarkdown if no output', async () => {
        const registerSpy = jest.spyOn(
            vscode.languages,
            'registerHoverProvider'
        )
        const context = { subscriptions: [] } as any
        await activate(context)

        const [, providerImpl] = registerSpy.mock.calls[0]

        ;(getHoveredWord as jest.Mock).mockReturnValue({
            prefix: 'prefix',
            token: 'token',
        })
        ;(resolveHoveredWord as jest.Mock).mockReturnValue('')
        const appendMarkdown = jest.fn()
        const appendCodeblock = jest.fn()

        jest.spyOn(vscode, 'MarkdownString').mockImplementation(() => {
            return {
                appendMarkdown,
                appendCodeblock,
            } as unknown as vscode.MarkdownString
        })

        const token = {
            isCancellationRequested: false,
            onCancellationRequested: jest.fn(),
        } as vscode.CancellationToken

        await providerImpl.provideHover(document, position, token)

        expect(appendMarkdown).not.toHaveBeenCalled()
        expect(appendCodeblock).not.toHaveBeenCalled()
    })
})
