import '../SvarohJsFormValidator';
import SymfonyComponentValidatorConstraintsFile from './File';

// The default messages of Symfony\Component\Validator\Constraints\File
const MAX_SIZE_MESSAGE = 'The file is too large ({{ size }} {{ suffix }}). Allowed maximum size is {{ limit }} {{ suffix }}.';
const MIME_TYPES_MESSAGE = 'The mime type of the file is invalid ({{ type }}). Allowed mime types are {{ types }}.';
const EXTENSIONS_MESSAGE = 'The extension of the file is invalid ({{ extension }}). Allowed extensions are {{ extensions }}.';
const DISALLOW_EMPTY_MESSAGE = 'An empty file is not allowed.';
const FILENAME_TOO_LONG_MESSAGE = 'The filename is too long. It should have {{ filename_max_length }} character or less.'
    + '|The filename is too long. It should have {{ filename_max_length }} characters or less.';

function createConstraint(options) {
    const constraint = new SymfonyComponentValidatorConstraintsFile();
    constraint.maxSizeMessage = MAX_SIZE_MESSAGE;
    constraint.mimeTypesMessage = MIME_TYPES_MESSAGE;
    constraint.extensionsMessage = EXTENSIONS_MESSAGE;
    constraint.disallowEmptyMessage = DISALLOW_EMPTY_MESSAGE;
    constraint.filenameTooLongMessage = FILENAME_TOO_LONG_MESSAGE;

    for (const name in options) {
        constraint[name] = options[name];
    }
    constraint.onCreate();

    return constraint;
}

function createFile(name, size, type) {
    return { name, size, type: type || '' };
}

describe('SymfonyComponentValidatorConstraintsFile size', () => {
    test.each([
        // size, maxSize, binaryFormat, expected message
        [3000000, 2000000, false, 'The file is too large (3 MB). Allowed maximum size is 2 MB.'],
        [3145728, 2097152, true, 'The file is too large (3 MiB). Allowed maximum size is 2 MiB.'],
        [2000, 1500, false, 'The file is too large (2 kB). Allowed maximum size is 1.5 kB.'],
        [250, 100, false, 'The file is too large (250 bytes). Allowed maximum size is 100 bytes.'],
        // A limit that needs more than 2 decimals is factorized further down
        [2000000, 1234567, false, 'The file is too large (2000000 bytes). Allowed maximum size is 1234567 bytes.'],
        // A size that rounds to the limit is factorized further down as well
        [2004000, 2000000, false, 'The file is too large (2004 kB). Allowed maximum size is 2000 kB.'],
    ])(
        'reports a file of %s bytes over a limit of %s',
        (size, maxSize, binaryFormat, expected) => {
            const constraint = createConstraint({ maxSize, binaryFormat });

            expect(constraint.validate([createFile('report.pdf', size)])).toStrictEqual([expected]);
        },
    );

    test('accepts a file within the limit', () => {
        const constraint = createConstraint({ maxSize: 2000000 });

        expect(constraint.validate([createFile('report.pdf', 2000000)])).toStrictEqual([]);
    });

    test('reports an empty file before any other check', () => {
        const constraint = createConstraint({ maxSize: 10, mimeTypes: ['image/png'] });

        expect(constraint.validate([createFile('empty.txt', 0, 'text/plain')]))
            .toStrictEqual([DISALLOW_EMPTY_MESSAGE]);
    });

    test('does not check the size when no limit is configured', () => {
        const constraint = createConstraint({});

        expect(constraint.validate([createFile('report.pdf', 999999999)])).toStrictEqual([]);
    });

    test('onCreate turns an unusable limit into no limit at all', () => {
        const constraint = createConstraint({ maxSize: null, filenameMaxLength: null });

        expect(constraint.maxSize).toBeNull();
        expect(constraint.filenameMaxLength).toBeNull();
    });
});

describe('SymfonyComponentValidatorConstraintsFile mime types', () => {
    test('reports a mime type outside of the allowed list', () => {
        const constraint = createConstraint({ mimeTypes: ['image/png', 'image/jpeg'] });

        expect(constraint.validate([createFile('avatar.gif', 10, 'image/gif')])).toStrictEqual([
            'The mime type of the file is invalid ("image/gif"). Allowed mime types are "image/png", "image/jpeg".',
        ]);
    });

    test('accepts a mime type matched by a wildcard', () => {
        const constraint = createConstraint({ mimeTypes: ['image/*'] });

        expect(constraint.validate([createFile('avatar.gif', 10, 'image/gif')])).toStrictEqual([]);
        expect(constraint.validate([createFile('notes.txt', 10, 'text/plain')])).toStrictEqual([
            'The mime type of the file is invalid ("text/plain"). Allowed mime types are "image/*".',
        ]);
    });

    test('accepts a single mime type given as a string', () => {
        const constraint = createConstraint({ mimeTypes: 'application/pdf' });

        expect(constraint.validate([createFile('report.pdf', 10, 'application/pdf')])).toStrictEqual([]);
    });

    test('leaves a file the browser could not sniff to the server', () => {
        const constraint = createConstraint({ mimeTypes: ['image/png'] });

        expect(constraint.validate([createFile('avatar.png', 10, '')])).toStrictEqual([]);
    });
});

describe('SymfonyComponentValidatorConstraintsFile extensions', () => {
    test('reports an extension outside of the allowed list', () => {
        const constraint = createConstraint({ extensions: ['png', 'jpg'] });

        expect(constraint.validate([createFile('avatar.gif', 10)])).toStrictEqual([
            'The extension of the file is invalid ("gif"). Allowed extensions are "png", "jpg".',
        ]);
    });

    test('reads the extensions from the keys of a mime type map', () => {
        const constraint = createConstraint({ extensions: { png: ['image/png'] } });

        expect(constraint.validate([createFile('avatar.PNG', 10)])).toStrictEqual([]);
        expect(constraint.validate([createFile('avatar', 10)])).toStrictEqual([
            'The extension of the file is invalid (""). Allowed extensions are "png".',
        ]);
    });

    test('reports the extension and the mime type of the same file', () => {
        const constraint = createConstraint({ extensions: ['png'], mimeTypes: ['image/png'] });

        expect(constraint.validate([createFile('avatar.gif', 10, 'image/gif')])).toStrictEqual([
            'The extension of the file is invalid ("gif"). Allowed extensions are "png".',
            'The mime type of the file is invalid ("image/gif"). Allowed mime types are "image/png".',
        ]);
    });
});

describe('SymfonyComponentValidatorConstraintsFile filename length', () => {
    test.each([
        // filenameCountUnit, filename, expected length
        ['bytes', 'aé.png', 7],
        ['codepoints', 'aé.png', 6],
        ['bytes', '文.png', 7],
        ['codepoints', '文.png', 5],
        ['bytes', '\u{1F600}.png', 8],
        ['codepoints', '\u{1F600}.png', 5],
        ['graphemes', '\u{1F600}.png', 5],
    ])(
        'counts a filename in %s',
        (filenameCountUnit, filename, expected) => {
            const constraint = createConstraint({ filenameCountUnit });

            expect(constraint.getFilenameLength(filename)).toBe(expected);
        },
    );

    test('falls back to code points where graphemes cannot be segmented', () => {
        const constraint = createConstraint({ filenameCountUnit: 'graphemes' });
        const segmenter = Intl.Segmenter;
        delete Intl.Segmenter;

        try {
            expect(constraint.getFilenameLength('\u{1F600}.png')).toBe(5);
        } finally {
            Intl.Segmenter = segmenter;
        }
    });

    test('reports a filename over the maximum length with the plural message', () => {
        const constraint = createConstraint({ filenameMaxLength: 5 });

        expect(constraint.validate([createFile('avatar.png', 10)])).toStrictEqual([
            'The filename is too long. It should have 5 characters or less.',
        ]);
        expect(constraint.validate([createFile('a.png', 10)])).toStrictEqual([]);
    });

    test('uses the singular message for a maximum length of one', () => {
        const constraint = createConstraint({ filenameMaxLength: 1 });

        expect(constraint.validate([createFile('avatar.png', 10)])).toStrictEqual([
            'The filename is too long. It should have 1 character or less.',
        ]);
    });
});

describe('SymfonyComponentValidatorConstraintsFile values', () => {
    test('validates every file of a multiple upload', () => {
        const constraint = createConstraint({ maxSize: 100 });

        expect(constraint.validate([
            createFile('small.png', 10),
            createFile('big.png', 250),
        ])).toStrictEqual([
            'The file is too large (250 bytes). Allowed maximum size is 100 bytes.',
        ]);
    });

    test('accepts a single file object', () => {
        const constraint = createConstraint({ maxSize: 100 });

        expect(constraint.validate(createFile('big.png', 250))).toStrictEqual([
            'The file is too large (250 bytes). Allowed maximum size is 100 bytes.',
        ]);
    });

    test('validates a real File of the browser', () => {
        const constraint = createConstraint({ maxSize: 2, mimeTypes: ['image/png'] });

        expect(constraint.validate([new File(['abc'], 'avatar.png', { type: 'image/png' })])).toStrictEqual([
            'The file is too large (3 bytes). Allowed maximum size is 2 bytes.',
        ]);
    });

    test.each([
        [[]],
        [''],
        ['/tmp/upload.png'],
        [null],
        [undefined],
        [{ name: 'avatar.png' }],
    ])(
        'leaves a value without file information alone: %p',
        (value) => {
            const constraint = createConstraint({ maxSize: 1, mimeTypes: ['image/png'] });

            expect(constraint.validate(value)).toStrictEqual([]);
        },
    );
});
