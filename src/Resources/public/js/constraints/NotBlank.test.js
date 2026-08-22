import '../SvarohJsFormValidator';
import SymfonyComponentValidatorConstraintsNotBlank from './NotBlank';

const constraintNotBlank = new SymfonyComponentValidatorConstraintsNotBlank();
constraintNotBlank.message = '{{ value }} have to be not blank';

test.each([
    [0, []],
    [[0], []],
    ['SvarohJsFormValidator', []],
    ['', ['\"\" have to be not blank']],
    [null, ['null have to be not blank']],
    [undefined, ['undefined have to be not blank']],
    [[], ['array have to be not blank']],
])(
    'SymfonyComponentValidatorConstraintsNotBlank',
    (value, expected) => {
        expect(constraintNotBlank.validate(value)).toStrictEqual(expected);
    },
);

test('keeps a whitespace only value when the constraint is not normalized', () => {
    // Symfony does not normalize by itself, a form that is not trimmed submits
    // the spaces as they are and the server accepts them
    expect(constraintNotBlank.validate('   ')).toStrictEqual([]);
});

test('trims the value when the constraint is normalized with "trim"', () => {
    const constraint = new SymfonyComponentValidatorConstraintsNotBlank();
    constraint.message = '{{ value }} have to be not blank';
    constraint.normalizer = 'trim';

    // The characters the PHP "trim" function strips off both ends
    expect(constraint.validate(' \t\r\n\v\0 ')).toStrictEqual(['"" have to be not blank']);
    expect(constraint.validate('  a  ')).toStrictEqual([]);
});

test('leaves a value alone when the normalizer is not portable', () => {
    const constraint = new SymfonyComponentValidatorConstraintsNotBlank();
    constraint.message = '{{ value }} have to be not blank';
    // Any other callable does not make it to the browser as a name it can use
    constraint.normalizer = 'strtolower';

    expect(constraint.validate('   ')).toStrictEqual([]);
});

test('leaves a non string value to the normalizer alone', () => {
    const constraint = new SymfonyComponentValidatorConstraintsNotBlank();
    constraint.message = '{{ value }} have to be not blank';
    constraint.normalizer = 'trim';

    expect(constraint.validate(0)).toStrictEqual([]);
    expect(constraint.validate(['  '])).toStrictEqual([]);
});

test('accepts null when the constraint allows it', () => {
    const constraint = new SymfonyComponentValidatorConstraintsNotBlank();
    constraint.message = '{{ value }} have to be not blank';
    constraint.allowNull = true;

    expect(constraint.validate(null)).toStrictEqual([]);
    // Only null is allowed, the other blank values still are errors
    expect(constraint.validate('')).toStrictEqual(['"" have to be not blank']);
    expect(constraint.validate(undefined)).toStrictEqual(['undefined have to be not blank']);
});

test('reports a textarea filled with spaces only as blank', () => {
    // Symfony trims the submitted value before it validates it, so a textarea
    // that contains nothing but spaces has to be reported as blank
    const constraint = new SymfonyComponentValidatorConstraintsNotBlank();
    constraint.message = 'This value should not be blank.';

    const element = new window.SvarohJsFormElement();
    element.id = 'form_description';
    element.type = 'Symfony\\Component\\Form\\Extension\\Core\\Type\\TextareaType';
    element.domNode = document.createElement('textarea');
    element.domNode.value = '   \n  ';
    element.data = {
        form: {
            groups: ['Default'],
            constraints: [constraint],
            getters: {},
        },
    };

    const errors = window.SvarohJsFormValidator.validateElement(element);

    expect(errors.map((error) => error.message)).toEqual(['This value should not be blank.']);

    // A form that is configured with "trim" set to false keeps the spaces and
    // so does the server side
    element.trim = false;

    expect(window.SvarohJsFormValidator.validateElement(element)).toStrictEqual([]);
});
