//noinspection JSUnusedGlobalSymbols
/**
 * Checks if value is equal to the predefined value
 * @constructor
 * @author dev.ymalcev@gmail.com
 */
export default function SymfonyComponentValidatorConstraintsEqualTo() {
    this.message = '';
    this.value = null;
    this.propertyPath = null;

    /**
     * @param {*} value
     * @param {SvarohJsFormElement} element
     * @param {SvarohJsFormElement} scope
     */
    this.validate = function (value, element, scope) {
        var errors = [];
        var comparedValue = SvarohJsBaseConstraint.getComparedValue(this, scope);
        if (undefined === comparedValue) {
            return errors;
        }

        var f = SvarohJsFormValidator;

        if (!f.isValueEmty(value) && comparedValue != value) {
            errors.push(
                this.message
                    .replace('{{ value }}', SvarohJsBaseConstraint.formatValue(value))
                    .replace('{{ compared_value }}', SvarohJsBaseConstraint.formatValue(comparedValue))
                    .replace('{{ compared_value_type }}', SvarohJsBaseConstraint.formatValue(comparedValue))
            );
        }

        return errors;
    }
}

window.SymfonyComponentValidatorConstraintsEqualTo = SymfonyComponentValidatorConstraintsEqualTo;