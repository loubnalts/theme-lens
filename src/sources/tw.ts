import * as vscode from 'vscode'
import * as fs from 'fs'
import { readFile } from 'fs/promises'
import kebabCase from 'lodash/kebabCase'
import merge from 'lodash/merge'
import { CssMapType, pluralMap } from '../constants/config'
import * as acorn from 'acorn'
import { isEmpty } from 'lodash'
import evaluate from 'static-eval'
import type { Expression } from 'estree'

export const scanCssVar = async (cssVarName: string): Promise<string> => {
    const isCssVar = cssVarName.match(/var\((--[\w-]+)\)/)
    if (!isCssVar) {
        return cssVarName
    }

    const varName = isCssVar[1]
    const files = await vscode.workspace.findFiles(
        '**/**/*.css',
        '**/{node_modules,dist,build,.next,.cache,coverage}/**'
    )
    const content = files
        .map((f) => fs.readFileSync(f.fsPath, 'utf8'))
        .join('\n')

    const match = content.match(new RegExp(`${varName}\\s*:\\s*([^;}]+)[;}]`))

    return match?.[1].trim() ?? ''
}

export const scanHelper = { scanCssVar }

export const scanTwFiles = async (): Promise<CssMapType[]> => {
    const cssMap: CssMapType[] = []

    const files = await vscode.workspace.findFiles(
        '**/**/*.css',
        '**/{node_modules,dist,build,.next,.cache,coverage}/**'
    )

    files.forEach((file) => {
        const content = fs.readFileSync(file.fsPath, 'utf8')
        const matches = [...content.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)]
        matches.forEach((match) => {
            cssMap.push({
                name: `--${match[1].trim()}`,
                value: match[2].trim(),
            })
        })
    })

    return cssMap
}

export const scanLegacyTwFiles = async (): Promise<CssMapType[]> => {
    const cssMap: CssMapType[] = []

    const files = await vscode.workspace.findFiles(
        '**/{tailwind.config.js,tailwind.config.ts,tailwind.config.cjs,tailwind.config.mjs}',
        '**/{node_modules,dist,build,.next,.cache,coverage}/**'
    )

    const configs = await Promise.all(
        files.map(async (f) => {
            const code = await readFile(f.fsPath, 'utf-8')
            const ast = acorn.parse(code, {
                sourceType: 'module',
                ecmaVersion: 'latest',
            })

            const exportDefault = ast.body.find(
                (n) => n.type === 'ExportDefaultDeclaration'
            )
            let decl

            if (exportDefault) {
                decl = exportDefault.declaration
            } else {
                const moduleExport = ast.body.find(
                    (n) => n.type === 'ExpressionStatement'
                )

                if (
                    moduleExport?.type === 'ExpressionStatement' &&
                    moduleExport.expression.type === 'AssignmentExpression'
                ) {
                    const assign = moduleExport.expression

                    if (
                        assign.left.type === 'MemberExpression' &&
                        assign.left.object.type === 'Identifier' &&
                        assign.left.property.type === 'Identifier'
                    ) {
                        decl = moduleExport?.expression.right
                    }
                }
            }

            if (decl?.type !== 'ObjectExpression') {
                return null
            }

            const themeProp = decl.properties?.find(
                (p) => 'key' in p && 'name' in p.key && p.key.name === 'theme'
            )

            if (!themeProp || !('value' in themeProp)) {
                return null
            }

            return evaluate(themeProp.value as unknown as Expression, {})
        })
    )

    if (isEmpty(configs.filter(Boolean))) return []

    const themes = merge({}, ...configs.map((c) => ({ ...c, ...c.extend })))
    await Promise.all(
        Object.keys(themes)
            .filter((f) => f !== 'extend')
            .map((nameSpace) => {
                const twStandardKey =
                    pluralMap[nameSpace] ??
                    kebabCase(nameSpace).replace(/s$/, '')
                Object.keys(themes[nameSpace]).map(async (tokenName) => {
                    const tokenValue = themes[nameSpace][tokenName]
                    if (
                        typeof tokenValue === 'object' &&
                        !Array.isArray(tokenValue)
                    ) {
                        Object.keys(tokenValue).map(async (scaleToken) => {
                            let suffix =
                                tokenName === 'DEFAULT'
                                    ? scaleToken
                                    : `${tokenName}-${scaleToken}`

                            cssMap.push({
                                name: `--${twStandardKey.trim()}-${suffix}`,
                                value: await scanCssVar(tokenValue[scaleToken]),
                            })
                        })
                    } else if (Array.isArray(tokenValue)) {
                        cssMap.push({
                            name: `--${twStandardKey.trim()}-${tokenName}`,
                            value: await scanCssVar(tokenValue[0]),
                        })
                    } else if (typeof tokenValue === 'function') {
                        return
                    } else if (
                        typeof tokenValue === 'string' &&
                        tokenValue.includes('theme(')
                    ) {
                        return
                    } else {
                        const tokenSuffix =
                            tokenName === 'DEFAULT' ? '' : `-${tokenName}`

                        cssMap.push({
                            name: `--${twStandardKey.trim()}${tokenSuffix}`,
                            value: await scanCssVar(tokenValue),
                        })
                    }
                })
            })
    )

    return cssMap
}

export const detectVersion = async () => {
    const packageJsonFiles = await vscode.workspace.findFiles(
        '**/{package.json}',
        '**/{node_modules,dist,build,.next,.cache,coverage}/**'
    )
    let twModuleVersion: string = ''

    await Promise.all(
        packageJsonFiles.map(async (file) => {
            const dataStr = await readFile(file.fsPath, { encoding: 'utf8' })
            let json = { dependencies: {}, devDependencies: {} }

            try {
                json = JSON.parse(dataStr)
            } catch (error) {
                json = { dependencies: {}, devDependencies: {} }
            }

            const deps = { ...json.dependencies, ...json.devDependencies }

            const hasTailwind = 'tailwindcss' in deps
            if (hasTailwind) {
                twModuleVersion = deps.tailwindcss as string
            }
        })
    )

    const version = twModuleVersion.replace(/[^0-9]/, '')[0]

    return version ? `v${version}` : ''
}

export const scanners = { scanTwFiles, scanLegacyTwFiles, detectVersion }

export const getTwScanCssMaps = async (): Promise<{
    cssMap: CssMapType[]
    watchFiles: string
}> => {
    const twVersion = await scanners.detectVersion()
    let cssMap: CssMapType[] = []
    let watchFiles: string
    switch (twVersion) {
        case 'v4':
            cssMap = await scanners.scanTwFiles()
            watchFiles = '**/*.css'
            break
        case 'v3':
            cssMap = await scanners.scanLegacyTwFiles()
            watchFiles =
                '**/{tailwind.config.js,tailwind.config.ts,tailwind.config.cjs,tailwind.config.mjs}'
            break
        default:
            cssMap = []
            watchFiles = ''
            break
    }

    return { cssMap, watchFiles }
}
export const globalScanner = { getTwScanCssMaps }

export const initScanner = async () => {
    let scanCssMaps: { cssMap: CssMapType[]; watchFiles: string } =
        await globalScanner.getTwScanCssMaps()

    const watcher = vscode.workspace.createFileSystemWatcher(
        scanCssMaps.watchFiles
    )

    const rescan = async () => {
        scanCssMaps = await globalScanner.getTwScanCssMaps()
    }

    watcher.onDidChange(rescan)
    watcher.onDidCreate(rescan)
    watcher.onDidDelete(rescan)

    return {
        watcher,
        getMap: () => scanCssMaps.cssMap,
    }
}
