//noinspection JSUnusedGlobalSymbols
/**
 * Reverses the localized formatting of a number field, so that "1.234,5" typed
 * in an "it" form is validated as 1234.5.
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
    ROUND_HALFUP
} from './LocalizedNumber.js';

export default function SymfonyComponentFormExtensionCoreDataTransformerNumberToLocalizedStringTransformer() {
    this.scale = null;
    this.grouping = false;
    this.roundingMode = ROUND_HALFUP;
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

        return roundToScale(number, this.scale, this.roundingMode);
    };
}

window.SymfonyComponentFormExtensionCoreDataTransformerNumberToLocalizedStringTransformer = SymfonyComponentFormExtensionCoreDataTransformerNumberToLocalizedStringTransformer;
