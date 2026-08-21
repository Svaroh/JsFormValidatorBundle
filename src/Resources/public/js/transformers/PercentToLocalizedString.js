//noinspection JSUnusedGlobalSymbols
/**
 * Reverses the localized formatting of a percent field: "12,5" typed in an
 * "it" form is validated as 0.125 for the default fractional type.
 *
 * @constructor
 */
import { parseLocalizedNumber, applyRounding, ROUND_HALFUP } from './LocalizedNumber.js';

export default function SymfonyComponentFormExtensionCoreDataTransformerPercentToLocalizedStringTransformer() {
    this.type = 'fractional';
    this.scale = 0;
    this.grouping = true;
    this.roundingMode = ROUND_HALFUP;
    this.html5Format = false;
    this.decimalSeparator = '.';
    this.groupingSeparator = ',';

    this.reverseTransform = function (value) {
        var number = parseLocalizedNumber(value, this);
        if (null === number) {
            return null;
        }

        var coefficient = Math.pow(10, this.scale);
        if ('fractional' === this.type) {
            number /= 100;
            coefficient *= 100;
        }

        return applyRounding(number, coefficient, this.roundingMode);
    };
}

window.SymfonyComponentFormExtensionCoreDataTransformerPercentToLocalizedStringTransformer = SymfonyComponentFormExtensionCoreDataTransformerPercentToLocalizedStringTransformer;
