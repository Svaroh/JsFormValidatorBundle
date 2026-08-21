//noinspection JSUnusedGlobalSymbols
/**
 * Reverses the localized formatting of a number field, so that "1.234,5" typed
 * in an "it" form is validated as 1234.5.
 *
 * @constructor
 */
import { parseLocalizedNumber, roundToScale, ROUND_HALFUP } from './LocalizedNumber.js';

export default function SymfonyComponentFormExtensionCoreDataTransformerNumberToLocalizedStringTransformer() {
    this.scale = null;
    this.grouping = false;
    this.roundingMode = ROUND_HALFUP;
    this.decimalSeparator = '.';
    this.groupingSeparator = ',';

    this.reverseTransform = function (value) {
        var number = parseLocalizedNumber(value, this);

        return null === number ? null : roundToScale(number, this.scale, this.roundingMode);
    };
}

window.SymfonyComponentFormExtensionCoreDataTransformerNumberToLocalizedStringTransformer = SymfonyComponentFormExtensionCoreDataTransformerNumberToLocalizedStringTransformer;
