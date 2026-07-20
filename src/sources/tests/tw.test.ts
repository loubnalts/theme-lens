jest.mock('fs', () => ({
    readFileSync: jest.fn(),
}))
jest.mock('fs/promises', () => ({
    readFile: jest.fn(),
}))
jest.mock('acorn', () => ({
    parse: jest.fn(),
}))
jest.mock('static-eval', () => ({
    __esModule: true,
    default: jest.fn(),
}))

import * as vscode from 'vscode'
import * as fs from 'fs'
import {
    detectVersion,
    getTwScanCssMaps,
    globalScanner,
    initScanner,
    scanCssVar,
    scanLegacyTwFiles,
    scanners,
    scanTwFiles,
} from '../tw'
import * as acorn from 'acorn'
import * as fsPromises from 'fs/promises'
import evaluate from 'static-eval'

describe('scanCssVar', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })
    it('should return argument if no match was found for css variable syntax', async () => {
        jest.spyOn(vscode.workspace, 'findFiles')

        const result = await scanCssVar('variable')

        expect(result).toEqual('variable')
        expect(vscode.workspace.findFiles).not.toHaveBeenCalled()
    })
    it('should return variable value from css file', async () => {
        jest.spyOn(vscode.workspace, 'findFiles').mockResolvedValue([
            { fsPath: 'tw.css' },
        ] as unknown as vscode.Uri[] | Thenable<vscode.Uri[]>)
        ;(fs.readFileSync as jest.Mock).mockReturnValue(
            '--color-var:#hex-code;'
        )

        const result = await scanCssVar('var(--color-var)')

        expect(result).toEqual('#hex-code')
        expect(vscode.workspace.findFiles).toHaveBeenCalled()
        expect(fs.readFileSync).toHaveBeenCalledWith('tw.css', 'utf8')
    })
    it('should return empty if variable returned from css has no match', async () => {
        jest.spyOn(vscode.workspace, 'findFiles').mockResolvedValue([
            { fsPath: 'tw.css' },
        ] as unknown as vscode.Uri[] | Thenable<vscode.Uri[]>)
        ;(fs.readFileSync as jest.Mock).mockReturnValue(
            '--color-var:#hex-code;'
        )

        const result = await scanCssVar('var(--text-var)')

        expect(result).toEqual('')
        expect(vscode.workspace.findFiles).toHaveBeenCalled()
        expect(fs.readFileSync).toHaveBeenCalledWith('tw.css', 'utf8')
    })
})

describe('scanTwFiles', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })
    it('should return css map based on scanned css files', async () => {
        jest.spyOn(vscode.workspace, 'findFiles').mockResolvedValue([
            { fsPath: 'tw.css' },
        ] as unknown as vscode.Uri[] | Thenable<vscode.Uri[]>)
        ;(fs.readFileSync as jest.Mock).mockReturnValue(
            '--color-var:#hex-code;'
        )

        const result = await scanTwFiles()
        expect(result).toEqual([{ name: '--color-var', value: '#hex-code' }])
    })
})

describe('scanLegacyTwFiles', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.resetModules()
    })
    describe('config', () => {
        it('should return empty array when no config are present - declaration type isnt ObjectExpression', async () => {
            jest.spyOn(vscode.workspace, 'findFiles').mockResolvedValue([
                { fsPath: '/project/tailwind.config.js' },
            ] as unknown as vscode.Uri[] | Thenable<vscode.Uri[]>)
            jest.spyOn(fsPromises, 'readFile').mockResolvedValue(
                `module.exports = {
                theme: {
                    colors: {
                        primary: '#7c3aed',
                    },
                },
            }`
            )
            ;(acorn.parse as jest.Mock).mockReturnValue({
                body: [
                    {
                        type: 'ExportDefaultDeclaration',
                        declaration: { type: 'sometype', properties: [] },
                    },
                ],
            })
            ;(evaluate as jest.Mock).mockReturnValue({})

            const result = await scanLegacyTwFiles()
            expect(result).toEqual([])
            expect(evaluate).not.toHaveBeenCalled()
        })

        it('should return empty array when no config are present - tw file exist but no theme object', async () => {
            jest.spyOn(vscode.workspace, 'findFiles').mockResolvedValue([
                { fsPath: '/project/tailwind.config.js' },
            ] as unknown as vscode.Uri[] | Thenable<vscode.Uri[]>)
            jest.spyOn(fsPromises, 'readFile').mockResolvedValue(
                `module.exports = {}`
            )
            ;(acorn.parse as jest.Mock).mockReturnValue({
                body: [
                    {
                        type: 'ExportDefaultDeclaration',
                        declaration: {
                            type: 'ObjectExpression',
                            properties: [],
                        },
                    },
                ],
            })
            ;(evaluate as jest.Mock).mockReturnValue({})

            const result = await scanLegacyTwFiles()
            expect(result).toEqual([])
            expect(evaluate).not.toHaveBeenCalled()
        })

        it('should return empty array when no config are present - tw file exist but no key.name=theme object', async () => {
            jest.spyOn(vscode.workspace, 'findFiles').mockResolvedValue([
                { fsPath: '/project/tailwind.config.js' },
            ] as unknown as vscode.Uri[] | Thenable<vscode.Uri[]>)
            jest.spyOn(fsPromises, 'readFile').mockResolvedValue(
                `module.exports = {}`
            )
            ;(acorn.parse as jest.Mock).mockReturnValue({
                body: [
                    {
                        type: 'ExportDefaultDeclaration',
                        declaration: {
                            type: 'ObjectExpression',
                            properties: [{ key: { name: 'key' } }],
                        },
                    },
                ],
            })
            ;(evaluate as jest.Mock).mockReturnValue({})

            const result = await scanLegacyTwFiles()
            expect(result).toEqual([])
            expect(evaluate).not.toHaveBeenCalled()
        })

        it('should handle file parsing for commonJS files', async () => {
            jest.spyOn(vscode.workspace, 'findFiles').mockResolvedValue([
                { fsPath: '/project/tailwind.config.js' },
            ] as unknown as vscode.Uri[] | Thenable<vscode.Uri[]>)
            jest.spyOn(fsPromises, 'readFile').mockResolvedValue(
                `module.exports = {
                theme: {
                    colors: {
                        primary: '#7c3aed',
                    },
                },
            }`
            )
            ;(acorn.parse as jest.Mock).mockReturnValue({
                body: [
                    {
                        type: 'ExportDefaultDeclaration',
                        declaration: {
                            type: 'ObjectExpression',
                            properties: [
                                {
                                    key: {
                                        name: 'theme',
                                    },
                                    value: {
                                        start: 'a',
                                        end: 'z',
                                    },
                                },
                            ],
                        },
                    },
                ],
            })
            ;(evaluate as jest.Mock).mockReturnValue({
                tw: { theme: 'exists' },
            })

            expect(evaluate).not.toHaveBeenCalled()

            const result = await scanLegacyTwFiles()
            expect(result).toEqual([
                {
                    name: '--tw-theme',
                    value: 'exists',
                },
            ])
        })

        it('should handle file parsing for ESM files', async () => {
            jest.spyOn(vscode.workspace, 'findFiles').mockResolvedValue([
                { fsPath: '/project/tailwind.config.js' },
            ] as unknown as vscode.Uri[] | Thenable<vscode.Uri[]>)
            jest.spyOn(fsPromises, 'readFile').mockResolvedValue(
                `module.exports = {
                theme: {
                    colors: {
                        primary: '#7c3aed',
                    },
                },
            }`
            )
            ;(acorn.parse as jest.Mock).mockReturnValue({
                body: [
                    {
                        type: 'ExpressionStatement',
                        expression: {
                            type: 'AssignmentExpression',
                            left: {
                                type: 'MemberExpression',
                                object: { type: 'Identifier' },
                                property: { type: 'Identifier' },
                            },
                            right: {
                                type: 'ObjectExpression',
                                properties: [
                                    {
                                        key: {
                                            name: 'theme',
                                        },
                                        value: {
                                            start: 'a',
                                            end: 'z',
                                        },
                                    },
                                ],
                            },
                        },
                    },
                ],
            })
            ;(evaluate as jest.Mock).mockReturnValue({
                tw: { theme: 'exists' },
            })

            expect(evaluate).not.toHaveBeenCalled()

            const result = await scanLegacyTwFiles()
            expect(result).toEqual([
                {
                    name: '--tw-theme',
                    value: 'exists',
                },
            ])
        })
        it('should return empty array for config if ESM files dont have correct structure', async () => {
            jest.spyOn(vscode.workspace, 'findFiles').mockResolvedValue([
                { fsPath: '/project/tailwind.config.js' },
            ] as unknown as vscode.Uri[] | Thenable<vscode.Uri[]>)
            jest.spyOn(fsPromises, 'readFile').mockResolvedValue(
                `module.exports = {
                theme: {
                    colors: {
                        primary: '#7c3aed',
                    },
                },
            }`
            )
            ;(acorn.parse as jest.Mock).mockReturnValue({
                body: [
                    {
                        type: 'ExpressionStatement',
                        expression: {
                            type: 'AssignmentExpression',
                            left: {},
                            right: {
                                type: 'ObjectExpression',
                                properties: [
                                    {
                                        key: {
                                            name: 'theme',
                                        },
                                        value: {
                                            start: 'a',
                                            end: 'z',
                                        },
                                    },
                                ],
                            },
                        },
                    },
                ],
            })

            expect(evaluate).not.toHaveBeenCalled()

            const result = await scanLegacyTwFiles()
            expect(result).toEqual([])
            expect(evaluate).not.toHaveBeenCalled()
        })

        it('should return empty array for config if ESM files dont have correct structure for expression type', async () => {
            jest.spyOn(vscode.workspace, 'findFiles').mockResolvedValue([
                { fsPath: '/project/tailwind.config.js' },
            ] as unknown as vscode.Uri[] | Thenable<vscode.Uri[]>)
            jest.spyOn(fsPromises, 'readFile').mockResolvedValue(
                `module.exports = {
                theme: {
                    colors: {
                        primary: '#7c3aed',
                    },
                },
            }`
            )
            ;(acorn.parse as jest.Mock).mockReturnValue({
                body: [
                    {
                        type: 'ExpressionStatement',
                        expression: {
                            type: 'some-expression',
                            left: {},
                            right: {
                                type: 'ObjectExpression',
                                properties: [
                                    {
                                        key: {
                                            name: 'theme',
                                        },
                                        value: {
                                            start: 'a',
                                            end: 'z',
                                        },
                                    },
                                ],
                            },
                        },
                    },
                ],
            })

            expect(evaluate).not.toHaveBeenCalled()

            const result = await scanLegacyTwFiles()
            expect(result).toEqual([])
            expect(evaluate).not.toHaveBeenCalled()
        })
    })

    describe('theme content', () => {
        it('should return cssMap for tailwind themes for literal, object, and arrays', async () => {
            jest.spyOn(vscode.workspace, 'findFiles').mockResolvedValue([
                { fsPath: '/project/tailwind.config.js' },
            ] as unknown as vscode.Uri[] | Thenable<vscode.Uri[]>)
            jest.spyOn(fsPromises, 'readFile').mockResolvedValue(
                `module.exports = {
                theme: {
                    colors: {
                        primary: '#7c3aed',
                    },
                },
            }`
            )
            ;(acorn.parse as jest.Mock).mockReturnValue({
                body: [
                    {
                        type: 'ExportDefaultDeclaration',
                        declaration: {
                            type: 'ObjectExpression',
                            properties: [
                                {
                                    key: {
                                        name: 'theme',
                                    },
                                    value: {
                                        start: 'a',
                                        end: 'z',
                                    },
                                },
                            ],
                        },
                    },
                ],
            })
            ;(evaluate as jest.Mock).mockReturnValue({
                colors: {
                    berry: 'black',
                    coco: { '50': '#coco' },
                    teal: ['teal-1', {}],
                    DEFAULT: {
                        light: 'light',
                        dark: 'dark',
                    },
                },
                boxShadow: {
                    DEFAULT: 'none',
                    sm: 'some-val',
                },
                rounded: {
                    0: 'value-1',
                    1: 'value-2',
                },
            })

            const result = await scanLegacyTwFiles()
            expect(result).toEqual([
                { name: '--color-berry', value: 'black' },
                { name: '--color-coco-50', value: '#coco' },
                { name: '--color-teal', value: 'teal-1' },
                { name: '--color-light', value: 'light' },
                { name: '--color-dark', value: 'dark' },
                { name: '--shadow', value: 'none' },
                { name: '--shadow-sm', value: 'some-val' },
                { name: '--rounded-0', value: 'value-1' },
                { name: '--rounded-1', value: 'value-2' },
            ])
        })

        it('should not return cssMap for tailwind themes for function or theme - not supported', async () => {
            jest.spyOn(vscode.workspace, 'findFiles').mockResolvedValue([
                { fsPath: '/project/tailwind.config.js' },
            ] as unknown as vscode.Uri[] | Thenable<vscode.Uri[]>)
            jest.spyOn(fsPromises, 'readFile').mockResolvedValue(
                `module.exports = {
                theme: {
                    colors: {
                        primary: '#7c3aed',
                    },
                },
            }`
            )
            ;(acorn.parse as jest.Mock).mockReturnValue({
                body: [
                    {
                        type: 'ExportDefaultDeclaration',
                        declaration: {
                            type: 'ObjectExpression',
                            properties: [
                                {
                                    key: {
                                        name: 'theme',
                                    },
                                    value: {
                                        start: 'a',
                                        end: 'z',
                                    },
                                },
                            ],
                        },
                    },
                ],
            })
            ;(evaluate as jest.Mock).mockReturnValue({
                colors: {
                    berry: () => 'black',
                    coco: 'theme(value)',
                },
            })

            const result = await scanLegacyTwFiles()
            expect(result).toEqual([])
        })
    })
})

describe('detectVersion', () => {
    it('should return tailwind version if current project has one installed', async () => {
        jest.spyOn(vscode.workspace, 'findFiles').mockResolvedValue([
            { fsPath: 'tw.css' },
        ] as unknown as vscode.Uri[] | Thenable<vscode.Uri[]>)
        jest.spyOn(fsPromises, 'readFile').mockResolvedValue(
            `{
                "dependencies": {"tailwindcss": "^4.0.0"},
                "devDependencies": {}
            }`
        )

        const result = await detectVersion()

        expect(result).toEqual('v4')
        expect(vscode.workspace.findFiles).toHaveBeenCalled()
        expect(fsPromises.readFile).toHaveBeenCalled()
    })
    it('should return empty string if there is no version', async () => {
        jest.spyOn(vscode.workspace, 'findFiles').mockResolvedValue([
            { fsPath: 'tw.css' },
        ] as unknown as vscode.Uri[] | Thenable<vscode.Uri[]>)
        jest.spyOn(fsPromises, 'readFile').mockResolvedValue(
            `{
                "dependencies": {},
                "devDependencies": {}
            }`
        )

        const result = await detectVersion()
        expect(result).toEqual('')
    })
    it('should return empty string if there is an error in parsing package.json', async () => {
        jest.spyOn(vscode.workspace, 'findFiles').mockResolvedValue([
            { fsPath: 'tw.css' },
        ] as unknown as vscode.Uri[] | Thenable<vscode.Uri[]>)
        jest.spyOn(fsPromises, 'readFile').mockResolvedValue(
            `{
                 dependencies: {},
                devDependencies: {}
            }`
        )

        const result = await detectVersion()
        expect(result).toEqual('')
    })
})

describe('getTwScanCssMaps', () => {
    beforeEach(() => {
        jest.resetAllMocks()
        jest.restoreAllMocks()
    })
    it('should call scanTwFiles for tailwind v4 and return correct watchFile pattern', async () => {
        jest.spyOn(scanners, 'detectVersion').mockResolvedValue('v4')
        jest.spyOn(scanners, 'scanTwFiles').mockResolvedValue([
            { name: 'css-map-tw-v4', value: 'v4' },
        ])
        jest.spyOn(scanners, 'scanLegacyTwFiles')

        const result = await getTwScanCssMaps()

        expect(result).toEqual({
            cssMap: [{ name: 'css-map-tw-v4', value: 'v4' }],
            watchFiles: '**/*.css',
        })
        expect(scanners.detectVersion).toHaveBeenCalled()
        expect(scanners.scanTwFiles).toHaveBeenCalled()
        expect(scanners.scanLegacyTwFiles).not.toHaveBeenCalled()
    })
    it('should call scanLegacyTwFiles for tailwind v3', async () => {
        jest.spyOn(scanners, 'detectVersion').mockResolvedValue('v3')
        jest.spyOn(scanners, 'scanLegacyTwFiles').mockResolvedValue([
            { name: 'css-map-tw-v3', value: 'v3' },
        ])
        jest.spyOn(scanners, 'scanTwFiles')

        const result = await getTwScanCssMaps()

        expect(result).toEqual({
            cssMap: [{ name: 'css-map-tw-v3', value: 'v3' }],
            watchFiles:
                '**/{tailwind.config.js,tailwind.config.ts,tailwind.config.cjs,tailwind.config.mjs}',
        })
        expect(scanners.detectVersion).toHaveBeenCalled()
        expect(scanners.scanTwFiles).not.toHaveBeenCalled()
        expect(scanners.scanLegacyTwFiles).toHaveBeenCalled()
    })

    it('should handle default', async () => {
        jest.spyOn(scanners, 'detectVersion').mockResolvedValue('v-fake')
        jest.spyOn(scanners, 'scanTwFiles')
        jest.spyOn(scanners, 'scanLegacyTwFiles')

        const result = await getTwScanCssMaps()

        expect(result).toEqual({ cssMap: [], watchFiles: '' })
        expect(scanners.detectVersion).toHaveBeenCalled()
        expect(scanners.scanTwFiles).not.toHaveBeenCalled()
        expect(scanners.scanLegacyTwFiles).not.toHaveBeenCalled()
    })
})

describe('initScanner', () => {
    it('should call getTwScanCssMaps and call it again when there is updates in css files ', async () => {
        jest.spyOn(globalScanner, 'getTwScanCssMaps').mockResolvedValue({
            cssMap: [],
            watchFiles: 'files',
        })
        const onDidChangeMock = jest.fn()
        const watcherMock = {
            onDidChange: onDidChangeMock,
            onDidCreate: jest.fn(),
            onDidDelete: jest.fn(),
        }
        jest.spyOn(vscode.workspace, 'createFileSystemWatcher').mockReturnValue(
            watcherMock as any
        )

        await initScanner()

        const result = await initScanner()

        expect(globalScanner.getTwScanCssMaps).toHaveBeenCalled()
        expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith(
            'files'
        )
        expect(watcherMock.onDidChange).toHaveBeenCalled()
        expect(watcherMock.onDidCreate).toHaveBeenCalled()
        expect(watcherMock.onDidDelete).toHaveBeenCalled()

        const rescanCallback = onDidChangeMock.mock.calls[0][0]
        await rescanCallback()

        expect(result).toEqual({
            getMap: expect.any(Function),
            watcher: {
                onDidChange: expect.any(Function),
                onDidCreate: expect.any(Function),
                onDidDelete: expect.any(Function),
            },
        })
        expect(result.getMap()).toEqual([])
    })
})
