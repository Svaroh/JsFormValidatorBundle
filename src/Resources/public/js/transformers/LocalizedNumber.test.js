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
