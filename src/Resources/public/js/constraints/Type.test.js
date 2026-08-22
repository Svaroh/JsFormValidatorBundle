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
