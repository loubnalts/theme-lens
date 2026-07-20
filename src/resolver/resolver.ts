import * as vscode from 'vscode'
import { prefixMap, propertyMap } from '../constants/maps'
import { CssMapType } from '../constants/config'

export const getHoveredWord = (
    document: vscode.TextDocument,
    position: vscode.Position
) => {
    const range = document.getWordRangeAtPosition(position, /[\w-]+/)
    if (!range) return undefined

    const word = document.getText(range)
    const dashIndex = word.indexOf('-')

    const prefix = dashIndex === -1 ? word : word.slice(0, dashIndex)
    const token = dashIndex === -1 ? '' : word.slice(dashIndex + 1)

    return { prefix, token }
}

export const resolve = (cssMap: CssMapType[], varName: string) =>
    cssMap.find((cm) => cm.name === varName)

export const resolveValue = (value: string, cssMap: CssMapType[]): string => {
    const match = value.match(/var\((--[\w-]+)\)/)

    if (!match) return value

    const inner = cssMap.find((cm) => cm.name === match[1])
    if (!inner) return value

    return value.replace(match[0], resolveValue(inner.value, cssMap))
}

export const innerHelpers = { resolve, resolveValue }

export const resolveHoveredWord = (
    word: { prefix: string | undefined; token: string | undefined },
    cssMap: CssMapType[]
): string => {
    const { prefix, token } = word

    if (!prefix) return ''

    let namespaces = prefixMap[prefix] ?? []
    const cssMapTokenMatch = token ? `-${token}` : ''
    const namespace = namespaces.find(
        (n) => !!innerHelpers.resolve(cssMap, `--${n}${cssMapTokenMatch}`)
    )

    if (!namespace) return ''

    const resolved =
        innerHelpers.resolve(cssMap, `--${namespace}${cssMapTokenMatch}`) ??
        innerHelpers.resolve(cssMap, `--${token}`)

    if (!resolved) return ''

    let property = propertyMap[prefix]

    if (prefix === 'text' && namespace === 'text') {
        property = 'font-size'
    }

    const resolveAll = innerHelpers.resolveValue(resolved.value, cssMap)

    return `.${prefix}${cssMapTokenMatch} {\n ${property}: var(${resolved.name}) /* ${resolveAll} */;\n}`
}
