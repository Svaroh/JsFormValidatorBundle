import '../SvarohJsFormValidator';
import SymfonyComponentValidatorConstraintsRange from './Range';

const createConstraint = () => {
    const constraintsRange = new SymfonyComponentValidatorConstraintsRange();
    constraintsRange.maxMessage = 'max error';
    constraintsRange.minMessage = 'min error';
    constraintsRange.invalidMessage = 'invalid';

    return constraintsRange;
};

test.each([
    [1, 1, 1, []],
    [1, 5, 3, []],
    [1, 1, 'a', ['invalid']],
    [1, 5, 6, ['max error']],
    [5, 10, 3, ['min error']],
])(
    'SymfonyComponentValidatorConstraintsRange',
    (min, max, value, expected) => {
        const constraintsRange = createConstraint();
        constraintsRange.min = min;
        constraintsRange.max = max;
        expect(constraintsRange.validate(value)).toStrictEqual(expected);
    },
);

test.each([
    [1, 5, 0, ['range error from 1 to 5 for 0']],
    [1, 5, 6, ['range error from 1 to 5 for 6']],
    [1, 5, 3, []],
])(
    'SymfonyComponentValidatorConstraintsRange.notInRangeMessage',
    (min, max, value, expected) => {
        const constraintsRange = createConstraint();
        constraintsRange.notInRangeMessage = 'range error from {{ min }} to {{ max }} for {{ value }}';
        constraintsRange.min = min;
        constraintsRange.max = max;
        expect(constraintsRange.validate(value)).toStrictEqual(expected);
    },
);

test('SymfonyComponentValidatorConstraintsRange.onCreate keeps decimal bounds', () => {
    const constraintsRange = createConstraint();
    constraintsRange.min = 1.5;
    constraintsRange.max = 1000.5;
    constraintsRange.onCreate();

    expect(constraintsRange.min).toBe(1.5);
    expect(constraintsRange.max).toBe(1000.5);
    expect(constraintsRange.validate(1.2)).toStrictEqual(['min error']);
    expect(constraintsRange.validate(2)).toStrictEqual([]);
});

describe('SymfonyComponentValidatorConstraintsRange property paths', () => {
    const createScope = (min, max) => ({
        children: {
            floor: {
                name: 'floor',
                type: '',
                transformers: [],
                children: {},
                domNode: { tagName: 'input', value: min },
            },
            ceiling: {
                name: 'ceiling',
                type: '',
                transformers: [],
                children: {},
                domNode: { tagName: 'input', value: max },
            },
        },
    });

    test('reads the bounds from the referenced fields', () => {
        const constraintsRange = createConstraint();
        constraintsRange.minPropertyPath = 'floor';
        constraintsRange.maxPropertyPath = 'ceiling';
        constraintsRange.onCreate();

        expect(constraintsRange.validate(5, null, createScope('1', '10'))).toStrictEqual([]);
        expect(constraintsRange.validate(11, null, createScope('1', '10'))).toStrictEqual(['max error']);
        expect(constraintsRange.validate(0, null, createScope('1', '10'))).toStrictEqual(['min error']);
    });

    test('leaves a bound unchecked when its path matches no field', () => {
        const constraintsRange = createConstraint();
        constraintsRange.minPropertyPath = 'missing_field';
        constraintsRange.max = 10;
        constraintsRange.onCreate();

        expect(constraintsRange.validate(0, null, createScope('1', '10'))).toStrictEqual([]);
        expect(constraintsRange.validate(11, null, createScope('1', '10'))).toStrictEqual(['max error']);
    });
});
