//noinspection JSUnusedGlobalSymbols
/**
 * Checks if value is greater than or equal to the predefined value
 * @constructor
 * @author dev.ymalcev@gmail.com
 */
export default function SymfonyComponentValidatorConstraintsGreaterThanOrEqual() {
    this.message = '';
    this.value = null;
    this.propertyPath = null;

    /**
     * @param {*} value
     * @param {SvarohJsFormElement} element
     * @param {SvarohJsFormElement} scope
     */
    this.validate = function (value, element, scope) {
        var f = SvarohJsFormValidator;
        var comparedValue = SvarohJsBaseConstraint.getComparedValue(this, scope);
        if (undefined === comparedValue || f.isValueEmty(value) || value >= comparedValue) {
            return [];
        } else {
            return [
                this.message
                    .replace('{{ value }}', SvarohJsBaseConstraint.formatValue(value))
                    .replace('{{ compared_value }}', SvarohJsBaseConstraint.formatValue(comparedValue))
            ];
        }
    }
}

window.SymfonyComponentValidatorConstraintsGreaterThanOrEqual = SymfonyComponentValidatorConstraintsGreaterThanOrEqual;