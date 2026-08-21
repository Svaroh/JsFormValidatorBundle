//noinspection JSUnusedGlobalSymbols
/**
 * Checks if value is not equal to the predefined value
 * @constructor
 * @author dev.ymalcev@gmail.com
 */
export default function SymfonyComponentValidatorConstraintsNotEqualTo() {
    this.message = '';
    this.value = null;

    this.validate = function (value) {
        var errors = [];
        if ('' !== value && this.value == value) {
            errors.push(
                this.message
                    .replace('{{ value }}', SvarohJsBaseConstraint.formatValue(value))
                    .replace('{{ compared_value }}', SvarohJsBaseConstraint.formatValue(this.value))
                    .replace('{{ compared_value_type }}', SvarohJsBaseConstraint.formatValue(this.value))
            );
        }

        return errors;
    }
}

window.SymfonyComponentValidatorConstraintsNotEqualTo = SymfonyComponentValidatorConstraintsNotEqualTo;