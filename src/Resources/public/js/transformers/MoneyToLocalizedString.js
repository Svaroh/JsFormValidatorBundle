//noinspection JSUnusedGlobalSymbols
/**
 * Reverses the localized formatting of a money field and restores the divisor
 * that was applied when the amount was rendered.
 *
 * @constructor
 */
import {
    assertNotNaN,
    assertWithinIntegerRange,
    parseLocalizedNumber,
    readsAsInteger,
    roundToScale,
    toInteger,
    toPhpPrecision,
    PHP_INT_MAX,
    PHP_INT_MIN,
    ROUND_HALFUP
} from './LocalizedNumber.js';

export default function SymfonyComponentFormExtensionCoreDataTransformerMoneyToLocalizedStringTransformer() {
    this.scale = 2;
    this.grouping = true;
    this.roundingMode = ROUND_HALFUP;
    this.divisor = 1;
    this.input = 'float';
    this.decimalSeparator = '.';
    this.groupingSeparator = ',';
    this.minusSign = '-';
    this.zeroDigit = '0';
    this.exponentSymbol = 'E';

    this.reverseTransform = function (value) {
        assertNotNaN(value);

        var number = parseLocalizedNumber(value, this);
        if (null === number) {
            return null;
        }

        if (readsAsInteger(value, this, true)) {
            number = toInteger(number);
        }

        assertWithinIntegerRange(number);

        // PHP casts the multiplication to string before it casts it back
        number = toPhpPrecision(roundToScale(number, this.scale, this.roundingMode) * (this.divisor || 1));

        if ('integer' !== this.input) {
            return number;
        }

        if (number > PHP_INT_MAX || number < PHP_INT_MIN) {
            throw new Error(
                'Cannot cast "' + number + '" to an integer. Try setting the input to "float" instead.'
            );
        }

        return toInteger(number);
    };
}

window.SymfonyComponentFormExtensionCoreDataTransformerMoneyToLocalizedStringTransformer = SymfonyComponentFormExtensionCoreDataTransformerMoneyToLocalizedStringTransformer;
