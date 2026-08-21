//noinspection JSUnusedGlobalSymbols
/**
 * Reverses the localized formatting of an integer field, rejecting any value
 * that carries the decimal separator of the current locale.
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
    ROUND_DOWN
} from './LocalizedNumber.js';

export default function SymfonyComponentFormExtensionCoreDataTransformerIntegerToLocalizedStringTransformer() {
    this.scale = 0;
    this.grouping = false;
    this.roundingMode = ROUND_DOWN;
    this.decimalSeparator = '.';
    this.groupingSeparator = ',';
    this.minusSign = '-';
    this.zeroDigit = '0';
    this.exponentSymbol = 'E';

    this.reverseTransform = function (value) {
        if (typeof value === 'string' && -1 !== value.indexOf(this.decimalSeparator)) {
            throw new Error('The value "' + value + '" is not a valid integer.');
        }

        assertNotNaN(value);

        var number = parseLocalizedNumber(value, this);
        if (null === number) {
            return null;
        }

        if (readsAsInteger(value, this, true)) {
            number = toInteger(number);
        }

        assertWithinIntegerRange(number);

        return toInteger(roundToScale(number, this.scale, this.roundingMode));
    };
}

window.SymfonyComponentFormExtensionCoreDataTransformerIntegerToLocalizedStringTransformer = SymfonyComponentFormExtensionCoreDataTransformerIntegerToLocalizedStringTransformer;
