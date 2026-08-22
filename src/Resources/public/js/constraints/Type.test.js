import '../SvarohJsFormValidator';
import SymfonyComponentValidatorConstraintsType from './Type';

const constraintsType = new SymfonyComponentValidatorConstraintsType();
constraintsType.message = '{{ value }} is not typ of {{ type }}';

test.each([
    ['array', [], []],
    ['bool', true, []],
    ['boolean', false, []],
    ['callable', () => {}, []],
    ['float', 1.1, []],
    ['double', 1.1, []],
    ['real', 1.1, []],
    ['int', 1, []],
    ['integer', 1, []],
    ['long', 1, []],
    ['null', null, []],
    ['numeric', 1, []],
    ['object', {}, []],
    ['scalar', true, []],
    ['scalar', 1, []],
    ['scalar', 'a', []],
    ['', 'a', []],
    ['string', 'a', []],
    // The ctype_*() based types
    ['alnum', 'abc123', []],
    ['alpha', 'abc', []],
    ['cntrl', '\t\n', []],
    ['digit', '123', []],
    ['digit', '007', []],
    ['graph', 'a1-!', []],
    ['lower', 'abc', []],
    ['print', 'a 1 !', []],
    ['punct', '!?,.', []],
    ['space', ' \t\r\n', []],
    ['upper', 'ABC', []],
    ['xdigit', '1a2F', []],
    // Types the browser cannot check are left to the server side validation
    ['resource', 'anything', []],
    ['iterable', [1, 2], []],
    ['countable', [1, 2], []],
    ['App\\Entity\\User', {}, []],
])(
    'SymfonyComponentValidatorConstraintsType',
    (type, value, expected) => {
        constraintsType.type = type;
        expect(constraintsType.validate(value)).toStrictEqual(expected);
    },
);

test.each([
    // ctype_digit() means "every character is a decimal digit", nothing else
    ['digit', '12.3'],
    ['digit', '-1'],
    ['digit', '+1'],
    ['digit', ' 12'],
    ['digit', '12 '],
    ['digit', '1e3'],
    // Only ASCII digits count, the C locale knows no other ones
    ['digit', '١٢٣'],
    // PHP rejects everything that is not a string
    ['digit', 123],
    ['digit', true],
    ['alnum', 'a b'],
    ['alpha', 'abc1'],
    ['cntrl', 'a'],
    ['graph', 'a b'],
    ['lower', 'aBc'],
    ['print', 'a\tb'],
    ['punct', 'a!'],
    ['space', ' a '],
    ['upper', 'AbC'],
    ['xdigit', '1g'],
])(
    'SymfonyComponentValidatorConstraintsType rejects a wrong ctype value',
    (type, value) => {
        constraintsType.type = type;
        expect(constraintsType.validate(value)).toStrictEqual([
            window.SvarohJsBaseConstraint.formatValue(value) + ' is not typ of ' + type,
        ]);
    },
);

test('SymfonyComponentValidatorConstraintsType skips an empty value', () => {
    // An empty field is mapped to null by the form component, and the Type
    // constraint accepts null, so the client side must not report an error here
    constraintsType.type = 'digit';

    expect(constraintsType.validate('')).toStrictEqual([]);
});

test('SymfonyComponentValidatorConstraintsType does not throw on an unknown type', () => {
    constraintsType.type = 'App\\Entity\\User';

    expect(() => constraintsType.validate('anything')).not.toThrow();
});

// Symfony's TypeValidator returns before any check when the value is null, so
// an empty field is only ever reported by NotNull and NotBlank
test.each([
    ['array'],
    ['bool'],
    ['boolean'],
    ['callable'],
    ['float'],
    ['double'],
    ['real'],
    ['int'],
    ['integer'],
    ['long'],
    ['null'],
    ['numeric'],
    ['object'],
    ['scalar'],
    [''],
    ['string'],
    // The ctype_*() based types reject everything that is not a string, null
    // included, but the validator never gets that far
    ['alnum'],
    ['alpha'],
    ['cntrl'],
    ['digit'],
    ['graph'],
    ['lower'],
    ['print'],
    ['punct'],
    ['space'],
    ['upper'],
    ['xdigit'],
])(
    'SymfonyComponentValidatorConstraintsType accepts null for the %s type',
    (type) => {
        constraintsType.type = type;
        expect(constraintsType.validate(null)).toStrictEqual([]);
    },
);

// PHP checks the integer types with is_int(), which no string ever satisfies.
// The value has to be turned into a number by the reverse transformer of the
// field, not by loosening the comparison here
test.each([
    ['1'],
    ['1.5'],
    ['  1  '],
    ['0x10'],
    ['1e3'],
    [' '],
    [1.5],
    [true],
])(
    'SymfonyComponentValidatorConstraintsType rejects %p for the integer type',
    (value) => {
        constraintsType.type = 'integer';
        expect(constraintsType.validate(value)).toHaveLength(1);
    },
);

// https://github.com/formapro/JsFormValidatorBundle/issues/67 - an "integer"
// field is rendered as <input type="number">, whose value is read as a string
describe('Type on a Symfony integer field', () => {
    const NAMESPACE = 'Symfony\\Component\\Form\\Extension\\Core\\';

    /**
     * Builds the model the factory exports for an "integer" field carrying an
     * "@Assert\Type(type=integer)" constraint, and validates the given input.
     *
     * @param {String} input
     *
     * @return {Array} the reported messages
     */
    function validateInput(input) {
        document.body.innerHTML = '<form name="chart" id="chart">'
            + '<input type="number" id="chart_columns" name="chart[columns]">'
            + '</form>';
        document.getElementById('chart_columns').value = input;

        const element = window.SvarohJsFormValidator.initModel({
            id: 'chart',
            name: 'chart',
            type: NAMESPACE + 'Type\\FormType',
            invalidMessage: 'This value is not valid.',
            trim: true,
            bubbling: true,
            transformers: [],
            data: {},
            children: {
                columns: {
                    id: 'chart_columns',
                    name: 'columns',
                    type: NAMESPACE + 'Type\\IntegerType',
                    invalidMessage: 'Please enter an integer.',
                    trim: true,
                    bubbling: false,
                    transformers: [{
                        name: NAMESPACE + 'DataTransformer\\IntegerToLocalizedStringTransformer',
                        scale: 0,
                        grouping: false,
                        roundingMode: 2,
                        decimalSeparator: '.',
                        groupingSeparator: ',',
                        minusSign: '-',
                        zeroDigit: '0',
                        exponentSymbol: 'E',
                        groupingSize: 3,
                        secondaryGroupingSize: 0,
                    }],
                    children: {},
                    data: {
                        parent: {
                            constraints: {
                                'Symfony\\Component\\Validator\\Constraints\\Type': [{
                                    groups: ['Default'],
                                    message: 'This value should be of type {{ type }}.',
                                    type: 'integer',
                                }],
                            },
                            groups: ['Default'],
                        },
                    },
                },
            },
        });

        return window.SvarohJsFormValidator
            .validateElement(element.children.columns)
            .map((error) => error.message);
    }

    test('accepts the string the number input reports, reverse transformed to an integer', () => {
        expect(validateInput('5')).toStrictEqual([]);
        expect(validateInput('0')).toStrictEqual([]);
        expect(validateInput('-3')).toStrictEqual([]);
    });

    test('leaves an empty field to NotBlank instead of reporting the type', () => {
        expect(validateInput('')).toStrictEqual([]);
    });

    test('reports a fractional input with the invalid message of the field', () => {
        expect(validateInput('1.5')).toStrictEqual(['Please enter an integer.']);
    });
});
