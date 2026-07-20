export const languages = {
    registerHoverProvider: jest.fn(),
}

export class MarkdownString {
    appendCodeblock = jest.fn()
    appendMarkdown = jest.fn()
}

export class Hover {
    constructor(public contents: any) {}
}

export class Position {
    constructor(
        public line: number,
        public character: number
    ) {}
}

export class Range {
    constructor(
        public start: Position,
        public end: Position
    ) {}
}

export const workspace = {
    findFiles: jest.fn(),
    createFileSystemWatcher: jest.fn(),
}

export class TextDocument {
    getWordRangeAtPosition = jest.fn().mockReturnValue({
        start: new Position(0, 0),
        end: new Position(0, 10),
    })

    getText = jest.fn().mockReturnValue('bg-custom-brand')
}
