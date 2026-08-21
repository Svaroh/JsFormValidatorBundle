//noinspection JSUnusedGlobalSymbols
/**
 * Reverses the localized formatting of an integer field, rejecting any value
 * that carries the decimal separator of the current locale.
 *
 * @constructor
 */
import { parseLocalizedNumber, roundToScale, toInteger, ROUND_DOWN } from './LocalizedNumber.js';

export default function SymfonyComponentFormExtensionCoreDataTransformerIntegerToLocalizedStringTransformer() {
    this.scale = 0;
    this.grouping = false;
    this.roundingMode = ROUND_DOWN;
    this.decimalSeparator = '.';
    this.groupingSeparator = ',';

    this.reverseTransform = function (value) {
        if (typeof value === 'string' && -1 !== value.indexOf(this.decimalSeparator)) {
            throw new Error('The value "' + value + '" is not a valid integer.');
        }

        var number = parseLocalizedNumber(value, this);

        return null === number ? null : toInteger(roundToScale(number, this.scale, this.roundingMode));
    };
}

window.SymfonyComponentFormExtensionCoreDataTransformerIntegerToLocalizedStringTransformer = SymfonyComponentFormExtensionCoreDataTransformerIntegerToLocalizedStringTransformer;
