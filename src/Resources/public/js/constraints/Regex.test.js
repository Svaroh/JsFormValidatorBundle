import '../SvarohJsFormValidator';
import SymfonyComponentValidatorConstraintsRegex from './Regex';

const constraintsRegex = new SymfonyComponentValidatorConstraintsRegex();
constraintsRegex.message = '{{ value }} is not matched';

test.each([
    [/a|b/, true, 'a', []],
    [/a|b/, true, 'bbb', []],
    [/a|b/, true, 'c', ['\"c\" is not matched']],
    [/a|b/, true, '', []],
    // match=false inverts the check: the value is invalid when it matches
    [/\d/, false, 'John', []],
    [/\d/, false, 'John3', ['\"John3\" is not matched']],
    [/\d/, false, '', []],
])(
    'SymfonyComponentValidatorConstraintsRegex',
    (pattern, match, value, expected) => {
        constraintsRegex.pattern = pattern;
        constraintsRegex.match = match;
        expect(constraintsRegex.validate(value)).toStrictEqual(expected);
    },
);

test('SymfonyComponentValidatorConstraintsRegex match is true by default', () => {
    const constraint = new SymfonyComponentValidatorConstraintsRegex();
    expect(constraint.match).toBe(true);
});

// A "g" flagged regexp advances its own lastIndex on every test() call
test.each([
    [true, []],
    [false, ['\"John3\" is not matched']],
])(
    'SymfonyComponentValidatorConstraintsRegex is not affected by the "g" flag state, match=%s',
    (match, expected) => {
        const constraint = new SymfonyComponentValidatorConstraintsRegex();
        constraint.message = '{{ value }} is not matched';
        constraint.pattern = /\d/g;
        constraint.match = match;

        expect(constraint.validate('John3')).toStrictEqual(expected);
        expect(constraint.validate('John3')).toStrictEqual(expected);
        expect(constraint.validate('John3')).toStrictEqual(expected);
    },
);

test.each([
    ['/\\d/', false, 'John', []],
    ['/\\d/', false, 'John3', ['\"John3\" is not matched']],
    ['/[a-z]+/i', true, 'ABC', []],
])(
    'SymfonyComponentValidatorConstraintsRegex onCreate',
    (pattern, match, value, expected) => {
        const constraint = new SymfonyComponentValidatorConstraintsRegex();
        constraint.message = '{{ value }} is not matched';
        constraint.pattern = pattern;
        constraint.match = match;
        constraint.onCreate();

        expect(constraint.pattern).toBeInstanceOf(RegExp);
        expect(constraint.validate(value)).toStrictEqual(expected);
    },
);
