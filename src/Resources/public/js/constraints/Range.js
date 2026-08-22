//noinspection JSUnusedGlobalSymbols
/**
 * Checks if value is a number and is between min and max values
 * @constructor
 * @author dev.ymalcev@gmail.com
 */
export default function SymfonyComponentValidatorConstraintsRange() {
    this.maxMessage = '';
    this.minMessage = '';
    this.notInRangeMessage = '';
    this.invalidMessage = '';
    this.max = null;
    this.min = null;
    this.maxPropertyPath = null;
    this.minPropertyPath = null;

    /**
     * @param {*} value
     * @param {SvarohJsFormElement} element
     * @param {SvarohJsFormElement} scope
     */
    this.validate = function (value, element, scope) {
        var errors = [];
        var f = SvarohJsFormValidator;
        var min = this.getLimit(this.min, this.minPropertyPath, scope);
        var max = this.getLimit(this.max, this.maxPropertyPath, scope);

        if (f.isValueEmty(value)) {
            return errors;
        }
        if (isNaN(value)) {
            errors.push(
                this.invalidMessage
                    .replace('{{ value }}', SvarohJsBaseConstraint.formatValue(value))
            );
        }
        if (this.notInRangeMessage && !isNaN(min) && !isNaN(max) && (value < min || value > max)) {
            errors.push(
                this.notInRangeMessage
                    .replace('{{ value }}', SvarohJsBaseConstraint.formatValue(value))
                    .replace('{{ min }}', SvarohJsBaseConstraint.formatValue(min))
                    .replace('{{ max }}', SvarohJsBaseConstraint.formatValue(max))
            );

            return errors;
        }
        if (!isNaN(max) && value > max) {
            errors.push(
                this.maxMessage
                    .replace('{{ value }}', SvarohJsBaseConstraint.formatValue(value))
                    .replace('{{ limit }}', SvarohJsBaseConstraint.formatValue(max))
            );
        }
        if (!isNaN(min) && value < min) {
            errors.push(
                this.minMessage
                    .replace('{{ value }}', SvarohJsBaseConstraint.formatValue(value))
                    .replace('{{ limit }}', SvarohJsBaseConstraint.formatValue(min))
            );
        }

        return errors;
    };

    /**
     * Returns the limit to compare with: the "min"/"max" option, or the current
     * value of the field the "minPropertyPath"/"maxPropertyPath" option points
     * to. A path pointing outside of the form gives NaN, which leaves that side
     * of the range unchecked here and lets the server report it.
     *
     * @param {Number} limit
     * @param {String} propertyPath
     * @param {SvarohJsFormElement} scope
     *
     * @return {Number}
     */
    this.getLimit = function (limit, propertyPath, scope) {
        if (!propertyPath) {
            return limit;
        }

        return parseFloat(SvarohJsFormValidator.getPropertyPathValue(scope, propertyPath));
    };

    this.onCreate = function () {
        this.min = parseFloat(this.min);
        this.max = parseFloat(this.max);
    }
}

window.SymfonyComponentValidatorConstraintsRange = SymfonyComponentValidatorConstraintsRange;
