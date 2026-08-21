//noinspection JSUnusedGlobalSymbols
/**
 * Reverses the localized formatting of a money field and restores the divisor
 * that was applied when the amount was rendered.
 *
 * @constructor
 */
import { parseLocalizedNumber, roundToScale, toInteger, toPhpPrecision, ROUND_HALFUP } from './LocalizedNumber.js';

export default function SymfonyComponentFormExtensionCoreDataTransformerMoneyToLocalizedStringTransformer() {
    this.scale = 2;
    this.grouping = true;
    this.roundingMode = ROUND_HALFUP;
    this.divisor = 1;
    this.input = 'float';
    this.decimalSeparator = '.';
    this.groupingSeparator = ',';

    this.reverseTransform = function (value) {
        var number = parseLocalizedNumber(value, this);
        if (null === number) {
            return null;
        }

        // PHP casts the multiplication to string before it casts it back
        number = toPhpPrecision(roundToScale(number, this.scale, this.roundingMode) * (this.divisor || 1));

        return 'integer' === this.input ? toInteger(number) : number;
    };
}

window.SymfonyComponentFormExtensionCoreDataTransformerMoneyToLocalizedStringTransformer = SymfonyComponentFormExtensionCoreDataTransformerMoneyToLocalizedStringTransformer;
