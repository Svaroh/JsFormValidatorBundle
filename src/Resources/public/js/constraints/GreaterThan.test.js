import '../SvarohJsFormValidator';
import SymfonyComponentValidatorConstraintsGreaterThan from './GreaterThan';

const constraintsGraterThan = new SymfonyComponentValidatorConstraintsGreaterThan();
constraintsGraterThan.message = '{{ value }} is not greater than {{ compared_value }}';

test.each([
    [null, null, []],
    [1, 2, []],
    ['', '', []],
    ['a', 'b', []],
    [1, 1, ['1 is not greater than 1']],
    [2, 1, ['1 is not greater than 2']],
    ['b', 'a', ["\"a\" is not greater than \"b\""]],
])(
    'SymfonyComponentValidatorConstraintsGreaterThan',
    (valueToSet, value, expected) => {
        constraintsGraterThan.value = valueToSet;
        expect(constraintsGraterThan.validate(value)).toStrictEqual(expected);
    },
);

describe('SymfonyComponentValidatorConstraintsGreaterThan.propertyPath', () => {
    const createScope = (value) => ({
        children: {
            start_date: {
                name: 'start_date',
                type: '',
                transformers: [],
                children: {},
                domNode: {
                    tagName: 'input',
                    value,
                },
            },
        },
    });

    test('compares with the current value of the referenced field', () => {
        const constraint = new SymfonyComponentValidatorConstraintsGreaterThan();
        constraint.message = '{{ value }} is not greater than {{ compared_value }}';
        constraint.propertyPath = 'start_date';

        expect(constraint.validate('2024-02-01', null, createScope('2024-01-01'))).toStrictEqual([]);
        expect(constraint.validate('2024-01-01', null, createScope('2024-02-01'))).toStrictEqual([
            '"2024-01-01" is not greater than "2024-02-01"',
        ]);
    });

    test('stays silent when the path matches no field of the form', () => {
        const constraint = new SymfonyComponentValidatorConstraintsGreaterThan();
        constraint.message = '{{ value }} is not greater than {{ compared_value }}';
        constraint.propertyPath = 'missing_field';

        expect(constraint.validate('2024-01-01', null, createScope('2024-02-01'))).toStrictEqual([]);
    });
});
