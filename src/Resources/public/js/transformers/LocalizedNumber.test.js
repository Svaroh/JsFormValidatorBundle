import IntegerToLocalizedString from './IntegerToLocalizedString';
import MoneyToLocalizedString from './MoneyToLocalizedString';
import NumberToLocalizedString from './NumberToLocalizedString';
import PercentToLocalizedString from './PercentToLocalizedString';

const ENGLISH = { decimalSeparator: '.', groupingSeparator: ',' };
const ITALIAN = { decimalSeparator: ',', groupingSeparator: '.' };

const createNumber = (locale, options) => Object.assign(
    new NumberToLocalizedString(),
    { grouping: true },
    locale,
    options || {},
);

const createInteger = (locale) => Object.assign(new IntegerToLocalizedString(), locale);

const createMoney = (locale, options) => Object.assign(
    new MoneyToLocalizedString(),
    locale,
    options || {},
);

const createPercent = (locale, options) => Object.assign(
    new PercentToLocalizedString(),
    locale,
    options || {},
);

describe('Localized number transformers', () => {
    test('NumberToLocalizedString reads the English conventions', () => {
        const transformer = createNumber(ENGLISH);

        expect(transformer.reverseTransform('1,234.5')).toBe(1234.5);
        expect(transformer.reverseTransform('12.5')).toBe(12.5);
        expect(transformer.reverseTransform('1234')).toBe(1234);
        expect(transformer.reverseTransform('0012')).toBe(12);
        expect(transformer.reverseTransform('1 234')).toBe(1234);
        expect(transformer.reverseTransform('1,234,567.8')).toBe(1234567.8);
        expect(transformer.reverseTransform('.5')).toBe(0.5);
        expect(transformer.reverseTransform('1e-3')).toBe(0.001);
        expect(transformer.reverseTransform('1E3')).toBe(1000);
        expect(transformer.reverseTransform('')).toBeNull();
        expect(transformer.reverseTransform(null)).toBeNull();
    });

    test('NumberToLocalizedString reads the Italian conventions', () => {
        const transformer = createNumber(ITALIAN);

        expect(transformer.reverseTransform('12,5')).toBe(12.5);
        expect(transformer.reverseTransform('1.234,5')).toBe(1234.5);
        expect(transformer.reverseTransform('1.234.567,8')).toBe(1234567.8);
        expect(transformer.reverseTransform('1,2345')).toBe(1.2345);
        expect(transformer.reverseTransform('-3,5')).toBe(-3.5);
        expect(transformer.reverseTransform('12,')).toBe(12);
        expect(transformer.reverseTransform(',5')).toBe(0.5);
        expect(transformer.reverseTransform('1 234')).toBe(1234);
        expect(transformer.reverseTransform('1234')).toBe(1234);
    });

    test.each([
        [ENGLISH, '1.234,5'],
        [ENGLISH, '12,5'],
        [ENGLISH, '12,'],
        [ENGLISH, '-3,5'],
        [ENGLISH, '1,2345'],
        [ENGLISH, ',5'],
        [ITALIAN, '1,234.5'],
        [ITALIAN, '12.5'],
        [ITALIAN, '.5'],
        [ITALIAN, '1,234,567.8'],
    ])('NumberToLocalizedString rejects a value of the other locale', (locale, value) => {
        expect(() => createNumber(locale).reverseTransform(value))
            .toThrow('The number contains unrecognized characters: "' + value + '".');
    });

    test.each([
        ['abc'],
        ['12 5'],
        ['+5'],
        ['12.5.6'],
        [','],
    ])('NumberToLocalizedString rejects "%s"', (value) => {
        expect(() => createNumber(ENGLISH).reverseTransform(value)).toThrow('unrecognized characters');
    });

    test('NumberToLocalizedString rejects values that are not strings', () => {
        expect(() => createNumber(ENGLISH).reverseTransform(12.5)).toThrow('Expected a string.');
        expect(() => createNumber(ENGLISH).reverseTransform('NaN')).toThrow('"NaN" is not a valid number.');
    });

    test('NumberToLocalizedString accepts both separators when grouping is off', () => {
        const english = createNumber(ENGLISH, { grouping: false, scale: 2 });
        const italian = createNumber(ITALIAN, { grouping: false, scale: 2 });

        expect(english.reverseTransform('1,005')).toBe(1.01);
        expect(english.reverseTransform('1.005')).toBe(1.01);
        expect(english.reverseTransform('12,345')).toBe(12.35);
        expect(italian.reverseTransform('1,005')).toBe(1.01);
        expect(italian.reverseTransform('1.005')).toBe(1.01);
        expect(italian.reverseTransform('12,345')).toBe(12.35);
    });

    test.each([
        [0, 2.5, 3],
        [0, -2.5, -2],
        [1, 2.5, 2],
        [1, -2.5, -3],
        [2, 2.5, 2],
        [2, -2.5, -2],
        [3, 2.5, 3],
        [3, -2.5, -3],
        [4, 2.5, 2],
        [4, 3.5, 4],
        [5, 2.5, 2],
        [5, -2.5, -2],
        [6, 2.5, 3],
        [6, -2.5, -3],
    ])('NumberToLocalizedString rounds %i for %f', (roundingMode, value, expected) => {
        const transformer = createNumber(ENGLISH, { scale: 0, roundingMode });

        expect(transformer.reverseTransform(String(value))).toBe(expected);
    });

    test('NumberToLocalizedString keeps the value when there is no scale', () => {
        expect(createNumber(ENGLISH).reverseTransform('2.5')).toBe(2.5);
    });

    test('IntegerToLocalizedString truncates and rejects the locale decimal separator', () => {
        const english = createInteger(ENGLISH);
        const italian = createInteger(ITALIAN);

        expect(english.reverseTransform('12')).toBe(12);
        expect(english.reverseTransform('12,5')).toBe(12);
        expect(english.reverseTransform('1,234')).toBe(1);
        expect(english.reverseTransform('-1,9')).toBe(-1);
        expect(english.reverseTransform('')).toBeNull();
        expect(() => english.reverseTransform('12.5'))
            .toThrow('The value "12.5" is not a valid integer.');

        expect(italian.reverseTransform('12')).toBe(12);
        expect(italian.reverseTransform('12.5')).toBe(12);
        expect(italian.reverseTransform('1.234')).toBe(1);
        expect(() => italian.reverseTransform('12,5'))
            .toThrow('The value "12,5" is not a valid integer.');
    });

    test('MoneyToLocalizedString applies the divisor', () => {
        const italian = createMoney(ITALIAN, { divisor: 100 });

        expect(italian.reverseTransform('12,50')).toBe(1250);
        expect(italian.reverseTransform('1.234,56')).toBe(123456);
        expect(italian.reverseTransform('')).toBeNull();
        expect(createMoney(ENGLISH, { divisor: 100 }).reverseTransform('12.50')).toBe(1250);
        expect(createMoney(ITALIAN).reverseTransform('12,505')).toBe(12.51);
        expect(createMoney(ITALIAN, { input: 'integer' }).reverseTransform('12,99')).toBe(12);
    });

    test('PercentToLocalizedString reads a fractional percentage', () => {
        const italian = createPercent(ITALIAN);

        expect(italian.reverseTransform('12,5')).toBe(0.13);
        expect(italian.reverseTransform('12')).toBe(0.12);
        expect(italian.reverseTransform('150')).toBe(1.5);
        expect(italian.reverseTransform('')).toBeNull();
        expect(createPercent(ENGLISH).reverseTransform('12.5')).toBe(0.13);
    });

    test('PercentToLocalizedString honours the scale and the integer type', () => {
        expect(createPercent(ITALIAN, { scale: 2 }).reverseTransform('12,5')).toBe(0.125);
        expect(createPercent(ITALIAN, { scale: 2 }).reverseTransform('12,345')).toBe(0.1235);
        expect(createPercent(ITALIAN, { scale: 1, type: 'integer' }).reverseTransform('12,5')).toBe(12.5);
    });

    test('The transformers fall back to the English conventions', () => {
        expect(new NumberToLocalizedString().reverseTransform('12.5')).toBe(12.5);
        expect(new IntegerToLocalizedString().reverseTransform('12')).toBe(12);
        expect(new MoneyToLocalizedString().reverseTransform('1,234.56')).toBe(1234.56);
        expect(new PercentToLocalizedString().reverseTransform('12.5')).toBe(0.13);
    });

    test('The transformers are registered as globals', () => {
        expect(window.SymfonyComponentFormExtensionCoreDataTransformerNumberToLocalizedStringTransformer)
            .toBe(NumberToLocalizedString);
        expect(window.SymfonyComponentFormExtensionCoreDataTransformerIntegerToLocalizedStringTransformer)
            .toBe(IntegerToLocalizedString);
        expect(window.SymfonyComponentFormExtensionCoreDataTransformerMoneyToLocalizedStringTransformer)
            .toBe(MoneyToLocalizedString);
        expect(window.SymfonyComponentFormExtensionCoreDataTransformerPercentToLocalizedStringTransformer)
            .toBe(PercentToLocalizedString);
    });
});

describe('Conventions that are not those of a Latin locale', () => {
    // Every expectation was taken from a run of the real Symfony transformers
    const SWEDISH = {
        decimalSeparator: ',',
        groupingSeparator: '\u00a0',
        minusSign: '\u2212',
        exponentSymbol: '\u00d710^',
        groupingSize: 3,
        secondaryGroupingSize: 0,
    };
    const ARABIC = {
        decimalSeparator: '\u066b',
        groupingSeparator: '\u066c',
        zeroDigit: '\u0660',
        minusSign: '\u061c-',
        exponentSymbol: '\u0627\u0633',
        groupingSize: 3,
        secondaryGroupingSize: 0,
    };
    const HINDI = {
        decimalSeparator: '.',
        groupingSeparator: ',',
        groupingSize: 3,
        secondaryGroupingSize: 2,
    };
    // Chakma writes its digits outside the basic multilingual plane
    const CHAKMA = { decimalSeparator: '.', groupingSeparator: ',', zeroDigit: '\u{11136}' };

    test('reads the minus sign of the locale', () => {
        const transformer = createNumber(SWEDISH);

        expect(transformer.reverseTransform('\u221212,5')).toBe(-12.5);
        expect(transformer.reverseTransform('\u22121\u00a0234,5')).toBe(-1234.5);
    });

    test.each(['\u2212', '\u2012', '\u2013', '\u207b', '\u2796', '\ufe63', '\uff0d'])(
        'reads %s as a minus sign in any locale',
        (sign) => {
            expect(createNumber(ENGLISH).reverseTransform(sign + '12.5')).toBe(-12.5);
        },
    );

    test('reads the digits of the locale', () => {
        expect(createNumber(ARABIC).reverseTransform('\u0661\u0662\u066b\u0665')).toBe(12.5);
        expect(createNumber(ARABIC).reverseTransform('\u061c-\u0661\u0662')).toBe(-12);
        expect(createNumber(CHAKMA).reverseTransform('\u{11137}\u{11138}.\u{1113b}')).toBe(12.5);
    });

    test('reads the exponent symbol of the locale', () => {
        expect(createNumber(SWEDISH).reverseTransform('1,2\u00d710^3')).toBe(1200);
        expect(createNumber(SWEDISH, { scale: 3 }).reverseTransform('1,2\u00d710^\u22123')).toBe(0.001);
        // "e" is not the symbol of that locale
        expect(() => createNumber(SWEDISH).reverseTransform('1,2e3')).toThrow('unrecognized characters');
    });

    test('reads the grouping of the Indian subcontinent', () => {
        const transformer = createNumber(HINDI);

        expect(transformer.reverseTransform('12,34,567.89')).toBe(1234567.89);
        expect(transformer.reverseTransform('1,23,45,678')).toBe(12345678);
        expect(transformer.reverseTransform('1,234')).toBe(1234);
        expect(() => transformer.reverseTransform('1,2345')).toThrow('unrecognized characters');
    });

    test('keeps rejecting the grouping of another locale', () => {
        expect(() => createNumber(ENGLISH).reverseTransform('12,34,567.89'))
            .toThrow('unrecognized characters');
    });
});

describe('The bounds and the whitespace of the Symfony transformers', () => {
    test.each([
        ['1e300'],
        ['99999999999999999999'],
        ['9223372036854775807'],
    ])('rejects %s, which reaches the PHP integer bounds', (value) => {
        expect(() => createNumber(ENGLISH).reverseTransform(value))
            .toThrow('I don\'t have a clear idea what infinity looks like.');
        expect(() => createInteger(ENGLISH).reverseTransform(value))
            .toThrow('I don\'t have a clear idea what infinity looks like.');
        expect(() => createMoney(ENGLISH).reverseTransform(value))
            .toThrow('I don\'t have a clear idea what infinity looks like.');
    });

    test('keeps a value that stays below the bounds', () => {
        expect(createNumber(ENGLISH, { grouping: false }).reverseTransform('1e18')).toBe(1e18);
    });

    test('refuses a money amount the divisor pushes out of the integer range', () => {
        const transformer = createMoney(ENGLISH, { input: 'integer', divisor: 1000000000000 });

        expect(() => transformer.reverseTransform('99999999'))
            .toThrow('Try setting the input to "float" instead.');
    });

    test('accepts the trailing whitespace PHP trims off the remainder', () => {
        const transformer = createNumber(ENGLISH);

        expect(transformer.reverseTransform('12.5 ')).toBe(12.5);
        expect(transformer.reverseTransform('12.5\t')).toBe(12.5);
        expect(transformer.reverseTransform('12.5\u00a0')).toBe(12.5);
    });

    test('rejects the leading whitespace the formatter stops on', () => {
        // A form that is not configured with "trim" set to false never gets one
        expect(() => createNumber(ENGLISH).reverseTransform(' 12.5'))
            .toThrow('unrecognized characters');
        expect(() => createNumber(ENGLISH).reverseTransform(' '))
            .toThrow('unrecognized characters');
    });

    test('refuses a rounding mode PHP has no arm for', () => {
        expect(() => createNumber(ENGLISH, { scale: 2, roundingMode: 42 }).reverseTransform('1.005'))
            .toThrow('Unsupported rounding mode "42".');
    });
});

describe('The percent transformer follows its own Symfony quirks', () => {
    test('reads a value without a decimal separator as an integer', () => {
        // PercentToLocalizedStringTransformer misses the "e-" check that its
        // number counterpart carries, so the fraction is truncated
        expect(createPercent(ENGLISH, { type: 'integer' }).reverseTransform('1e-3')).toBe(0);
        expect(createNumber(ENGLISH, { grouping: false }).reverseTransform('1e-3')).toBe(0.001);
    });

    test('keeps a value that carries the decimal separator', () => {
        expect(createPercent(ENGLISH, { type: 'integer', scale: 2 }).reverseTransform('12.5')).toBe(12.5);
    });

    test('rejects "NaN" without the message of the number transformer', () => {
        // Symfony reads it as 0 here; refusing it is deliberate
        expect(() => createPercent(ENGLISH).reverseTransform('NaN')).toThrow('unrecognized characters');
        expect(() => createNumber(ENGLISH).reverseTransform('NaN')).toThrow('"NaN" is not a valid number.');
    });
});
