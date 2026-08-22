//noinspection JSUnusedGlobalSymbols
/**
 * Checks if value is less than the predefined value
 * @constructor
 * @author dev.ymalcev@gmail.com
 */
export default function SymfonyComponentValidatorConstraintsLessThan() {
    this.message = '';
    this.value = null;

    this.validate = function (value) {
        var f = SvarohJsFormValidator;
        if (f.isValueEmty(value) || value < this.value) {
            return [];
        } else {
            return [
                this.message
                    .replace('{{ value }}', SvarohJsBaseConstraint.formatValue(value))
                    .replace('{{ compared_value }}', SvarohJsBaseConstraint.formatValue(this.value))
            ];
        }
    }
}

window.SymfonyComponentValidatorConstraintsLessThan = SymfonyComponentValidatorConstraintsLessThan;