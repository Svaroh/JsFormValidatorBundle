import '../SvarohJsFormValidator';
import SymfonyComponentValidatorConstraintsRange from './Range';

const createConstraint = () => {
    const constraintsRange = new SymfonyComponentValidatorConstraintsRange();
    constraintsRange.maxMessage = 'max error';
    constraintsRange.minMessage = 'min error';
    constraintsRange.invalidMessage = 'invalid';
    constraintsRange.invalidDateTimeMessage = 'invalid datetime';

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

    test('reads a date bound from the referenced field and compares it as a date', () => {
        const constraintsRange = createConstraint();
        constraintsRange.minPropertyPath = 'floor';
        constraintsRange.maxPropertyPath = 'ceiling';
        constraintsRange.onCreate();

        const scope = createScope('1990-01-01', '2000-12-31');

        // parseFloat() would cut the referenced bounds down to their year
        expect(constraintsRange.validate('1995-06-15', null, scope)).toStrictEqual([]);
        expect(constraintsRange.validate('1989-12-31', null, scope)).toStrictEqual(['min error']);
        expect(constraintsRange.validate('2001-01-01', null, scope)).toStrictEqual(['max error']);
        expect(constraintsRange.validate('not a date', null, scope)).toStrictEqual(['invalid datetime']);
    });

    test('reports a referenced date bound as the date it is', () => {
        const constraintsRange = createConstraint();
        constraintsRange.maxPropertyPath = 'ceiling';
        constraintsRange.maxMessage = 'max error, limit {{ limit }}';
        constraintsRange.onCreate();

        expect(constraintsRange.validate('2001-01-01', null, createScope('', '2000-12-31')))
            .toStrictEqual(['max error, limit "2000-12-31"']);
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

test.each([
    // A date field submits "Y-m-d", the bounds are exported in the same shape
    ['1990-01-01', '2000-12-31', '1995-06-15', []],
    ['1990-01-01', '2000-12-31', '1990-01-01', []],
    ['1990-01-01', '2000-12-31', '2000-12-31', []],
    ['1990-01-01', '2000-12-31', '1989-12-31', ['min error']],
    ['1990-01-01', '2000-12-31', '2001-01-01', ['max error']],
    // A single bound, the other one is not exported at all
    [null, '2000-12-31', '2001-01-01', ['max error']],
    [null, '2000-12-31', '1900-01-01', []],
    ['1990-01-01', null, '1989-12-31', ['min error']],
    ['1990-01-01', null, '2100-01-01', []],
    // A datetime field submits "Y-m-d H:i:s", or "Y-m-d\TH:i" for an HTML5 input
    ['2017-06-29 10:00:00', '2017-06-29 18:00:00', '2017-06-29 12:30:00', []],
    ['2017-06-29 10:00:00', '2017-06-29 18:00:00', '2017-06-29 09:59:59', ['min error']],
    ['2017-06-29 10:00:00', '2017-06-29 18:00:00', '2017-06-29T12:30', []],
    ['2017-06-29 10:00:00', '2017-06-29 18:00:00', '2017-06-29T18:01', ['max error']],
    // Bounds and value of a different precision stay comparable
    ['2017-06-29 00:00:00', '2017-06-30 00:00:00', '2017-06-29', []],
    ['2017-06-29 00:00:00', '2017-06-30 00:00:00', '2017-06-28', ['min error']],
])(
    'SymfonyComponentValidatorConstraintsRange compares date bounds as dates',
    (min, max, value, expected) => {
        const constraintsRange = createConstraint();
        constraintsRange.min = min;
        constraintsRange.max = max;
        constraintsRange.onCreate();

        expect(constraintsRange.validate(value)).toStrictEqual(expected);
    },
);

test('SymfonyComponentValidatorConstraintsRange.onCreate keeps date bounds', () => {
    const constraintsRange = createConstraint();
    constraintsRange.min = '1990-01-01';
    constraintsRange.max = '2000-12-31';
    constraintsRange.onCreate();

    // parseFloat() used to cut the bounds down to the year
    expect(constraintsRange.min).toBe('1990-01-01');
    expect(constraintsRange.max).toBe('2000-12-31');
});

test('SymfonyComponentValidatorConstraintsRange reports a non date value against date bounds', () => {
    const constraintsRange = createConstraint();
    constraintsRange.min = '1990-01-01';
    constraintsRange.max = '2000-12-31';
    constraintsRange.onCreate();

    expect(constraintsRange.validate('not a date')).toStrictEqual(['invalid datetime']);
    expect(constraintsRange.validate('29.06.2017')).toStrictEqual(['invalid datetime']);
    expect(constraintsRange.validate('1995')).toStrictEqual(['invalid datetime']);
});

test('SymfonyComponentValidatorConstraintsRange.notInRangeMessage keeps the date bounds readable', () => {
    const constraintsRange = createConstraint();
    constraintsRange.notInRangeMessage = 'range error from {{ min }} to {{ max }} for {{ value }}';
    constraintsRange.min = '1990-01-01';
    constraintsRange.max = '2000-12-31';
    constraintsRange.onCreate();

    expect(constraintsRange.validate('2001-01-01')).toStrictEqual([
        'range error from "1990-01-01" to "2000-12-31" for "2001-01-01"',
    ]);
    expect(constraintsRange.validate('1995-06-15')).toStrictEqual([]);
});

test('SymfonyComponentValidatorConstraintsRange keeps numeric bounds numeric', () => {
    const constraintsRange = createConstraint();
    constraintsRange.min = '1';
    constraintsRange.max = '5';
    constraintsRange.onCreate();

    expect(constraintsRange.min).toBe(1);
    expect(constraintsRange.max).toBe(5);
    // A date-looking value is not a number for a numeric range
    expect(constraintsRange.validate('1995-06-15')).toStrictEqual(['invalid']);
    expect(constraintsRange.validate('3')).toStrictEqual([]);
});
