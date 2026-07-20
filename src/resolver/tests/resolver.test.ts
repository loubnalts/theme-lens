import * as vscode from 'vscode'
import {
    getHoveredWord,
    innerHelpers,
    resolve,
    resolveHoveredWord,
    resolveValue,
} from '../resolver'

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim()

describe('getHoveredWord', () => {
    let position: vscode.Position
    let document: vscode.TextDocument
    beforeEach(() => {
        position = { line: 2, character: 4 } as unknown as vscode.Position
        document = {
            getWordRangeAtPosition: jest.fn(),
            getText: jest.fn(),
        } as unknown as vscode.TextDocument
    })
    it('should return undefined when word is not range', () => {
        ;(document.getWordRangeAtPosition as jest.Mock).mockReturnValue(
            undefined
        )

        expect(getHoveredWord(document, position)).toBeUndefined()
        expect(document.getWordRangeAtPosition).toHaveBeenCalledWith(
            position,
            /[\w-]+/
        )
        expect(document.getText).not.toHaveBeenCalled()
    })

    it('should return word when hovered word doesnt have hyphen', () => {
        ;(document.getWordRangeAtPosition as jest.Mock).mockReturnValue(
            'tw-class'
        )
        ;(document.getText as jest.Mock).mockReturnValue('tw')

        expect(getHoveredWord(document, position)).toEqual({
            prefix: 'tw',
            token: '',
        })
        expect(document.getWordRangeAtPosition).toHaveBeenCalledWith(
            position,
            /[\w-]+/
        )
        expect(document.getText).toHaveBeenCalledWith('tw-class')
    })

    it('should return prefix and token of hovered word if it matches a class name type ', () => {
        ;(document.getWordRangeAtPosition as jest.Mock).mockReturnValue(
            'tw-class'
        )
        ;(document.getText as jest.Mock).mockReturnValue('tw-class')

        expect(getHoveredWord(document, position)).toEqual({
            prefix: 'tw',
            token: 'class',
        })
        expect(document.getWordRangeAtPosition).toHaveBeenCalledWith(
            position,
            /[\w-]+/
        )
        expect(document.getText).toHaveBeenCalledWith('tw-class')
    })
})

describe('resolve', () => {
    it('should return variable from cssMap', () => {
        const cssMap = [
            { name: 'name-1', value: 'value-1' },
            { name: 'name-2', value: 'value-2' },
        ]
        expect(resolve(cssMap, 'name-1')).toEqual({
            name: 'name-1',
            value: 'value-1',
        })
    })
})

describe('resolveValue', () => {
    it('should return argument value if no match was found', () => {
        const cssMap = [
            { name: 'name-1', value: 'value-1' },
            { name: 'name-2', value: 'value-2' },
        ]
        expect(resolveValue('some-val', cssMap)).toEqual('some-val')
    })

    it('should return argument value if no value was found against cssMap', () => {
        const cssMap = [
            { name: 'name-1', value: 'var(--value-1)' },
            { name: 'name-2', value: 'value-2' },
        ]
        expect(resolveValue('var(--some-val)', cssMap)).toEqual(
            'var(--some-val)'
        )
    })

    it('should return resolved value', () => {
        const cssMap = [
            { name: '--value-1', value: 'some-value' },
            { name: 'name-2', value: 'value-2' },
        ]
        expect(resolveValue('var(--value-1)', cssMap)).toEqual('some-value')
    })
})

describe('resolveHoveredWord', () => {
    it('should return empty string if no prefix was provided', () => {
        const cssMap = [
            { name: 'name-1', value: 'value-1' },
            { name: 'name-2', value: 'value-2' },
        ]
        const word = { prefix: '', token: 'some-token' }

        expect(resolveHoveredWord(word, cssMap)).toEqual('')
    })

    it('should return empty string if namespace is undefined', () => {
        const cssMap = [
            { name: 'name-1', value: 'value-1' },
            { name: 'name-2', value: 'value-2' },
        ]
        const word = { prefix: 'some-prefix', token: 'some-token' }

        expect(resolveHoveredWord(word, cssMap)).toEqual('')
    })

    it('should return empty string if hovered word has no match in map', () => {
        jest.spyOn(innerHelpers, 'resolve')
            .mockReturnValueOnce({
                name: 'name',
                value: 'value',
            })
            .mockReturnValueOnce(undefined)

        const cssMap = [
            { name: 'name-1', value: 'value-1' },
            { name: 'name-2', value: 'value-2' },
        ]
        const word = { prefix: 'bg', token: 'custom-color' }

        expect(resolveHoveredWord(word, cssMap)).toEqual('')
    })

    it('should resolve token and prefix', () => {
        jest.spyOn(innerHelpers, 'resolve').mockReturnValue({
            name: 'name-1',
            value: 'value-1',
        })
        jest.spyOn(innerHelpers, 'resolveValue').mockReturnValue('custom-token')

        const cssMap = [
            { name: 'name-1', value: 'value-1' },
            { name: 'name-2', value: 'value-2' },
        ]
        const word = { prefix: 'bg', token: 'custom-color' }

        expect(normalize(resolveHoveredWord(word, cssMap))).toBe(
            normalize(`.bg-custom-color {
                background-color: var(name-1) /* custom-token */;
        }`)
        )
    })

    it('should resolve token and prefix if no resolve was found for namespace', () => {
        jest.spyOn(innerHelpers, 'resolve')
            .mockReturnValueOnce({
                name: 'name-1',
                value: 'value-1',
            })
            .mockReturnValueOnce(undefined)
            .mockReturnValueOnce({
                name: 'name-1',
                value: 'value-1',
            })
        jest.spyOn(innerHelpers, 'resolveValue').mockReturnValue('custom-token')

        const cssMap = [
            { name: 'name-1', value: 'value-1' },
            { name: 'name-2', value: 'value-2' },
        ]
        const word = { prefix: 'bg', token: 'custom-color' }

        expect(normalize(resolveHoveredWord(word, cssMap))).toBe(
            normalize(`.bg-custom-color {
                background-color: var(name-1) /* custom-token */;
        }`)
        )
    })

    it('should display correct property for text based classnames', () => {
        jest.spyOn(innerHelpers, 'resolve')
            .mockReturnValueOnce(undefined)
            .mockReturnValueOnce({
                name: 'name-1',
                value: 'value-1',
            })
            .mockReturnValueOnce(undefined)
            .mockReturnValueOnce({
                name: 'name-1',
                value: 'value-1',
            })
        jest.spyOn(innerHelpers, 'resolveValue').mockReturnValue('custom-token')

        const cssMap = [
            { name: 'name-1', value: 'value-1' },
            { name: 'name-2', value: 'value-2' },
        ]
        const word = { prefix: 'text', token: 'custom-text-size' }

        expect(normalize(resolveHoveredWord(word, cssMap))).toBe(
            normalize(
                `.text-custom-text-size { font-size: var(name-1) /* custom-token */; }`
            )
        )
    })

    it('should resolve for defined prefix and empty token', () => {
        jest.spyOn(innerHelpers, 'resolve').mockReturnValue({
            name: 'name-1',
            value: 'value-1',
        })
        jest.spyOn(innerHelpers, 'resolveValue').mockReturnValue('custom-token')

        const cssMap = [
            { name: 'name-1', value: 'value-1' },
            { name: 'name-2', value: 'value-2' },
        ]
        const word = { prefix: 'bg', token: '' }

        expect(normalize(resolveHoveredWord(word, cssMap))).toBe(
            normalize(`.bg {
                background-color: var(name-1) /* custom-token */;
        }`)
        )
    })
})
