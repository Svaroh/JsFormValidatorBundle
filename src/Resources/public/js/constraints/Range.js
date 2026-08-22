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
    this.invalidDateTimeMessage = '';
    this.max = null;
    this.min = null;
    this.maxPropertyPath = null;
    this.minPropertyPath = null;

    /**
     * The shapes a date value or a date bound can have: "Y-m-d", "Y-m-d H:i:s"
     * and the HTML5 "Y-m-d\TH:i" of a datetime-local input
     */
    var DATE = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

    /**
     * Converts a date string to a number which keeps the chronological order,
     * so dates of a different precision stay comparable. Anything which is not
     * a date string becomes NaN, just like a non numeric value does.
     *
     * @param {*} value
     *
     * @return {Number}
     */
    this.toDateNumber = function (value) {
        var parts = 'string' === typeof value ? DATE.exec(value) : null;

        if (null === parts) {
            return NaN;
        }

        return parseInt(
            parts[1] + parts[2] + parts[3] + (parts[4] || '00') + (parts[5] || '00') + (parts[6] || '00'),
            10
        );
    };

    /**
     * @param {*} value
     * @param {SvarohJsFormElement} element
     * @param {SvarohJsFormElement} scope
     */
    this.validate = function (value, element, scope) {
        var errors = [];
        var f = SvarohJsFormValidator;
        // The bounds as they are reported to the user: a number, or the date
        // string a date bound keeps
        var minLimit = this.getLimit(this.min, this.minPropertyPath, scope);
        var maxLimit = this.getLimit(this.max, this.maxPropertyPath, scope);

        if (f.isValueEmty(value)) {
            return errors;
        }

        // Symfony compares a date value as a date as soon as a bound is a date.
        // Relative bounds such as "today" are resolved to a concrete date by
        // the PHP side, so both bounds are plain date strings here
        var min = this.toDateNumber(minLimit);
        var max = this.toDateNumber(maxLimit);
        var subject = value;

        if (!isNaN(min) || !isNaN(max)) {
            subject = this.toDateNumber(value);

            if (isNaN(subject)) {
                errors.push(
                    this.invalidDateTimeMessage
                        .replace('{{ value }}', SvarohJsBaseConstraint.formatValue(value))
                );

                return errors;
            }
        } else {
            min = minLimit;
            max = maxLimit;

            if (isNaN(value)) {
                errors.push(
                    this.invalidMessage
                        .replace('{{ value }}', SvarohJsBaseConstraint.formatValue(value))
                );
            }
        }

        if (this.notInRangeMessage && !isNaN(min) && !isNaN(max) && (subject < min || subject > max)) {
            errors.push(
                this.notInRangeMessage
                    .replace('{{ value }}', SvarohJsBaseConstraint.formatValue(value))
                    .replace('{{ min }}', SvarohJsBaseConstraint.formatValue(minLimit))
                    .replace('{{ max }}', SvarohJsBaseConstraint.formatValue(maxLimit))
            );

            return errors;
        }
        if (!isNaN(max) && subject > max) {
            errors.push(
                this.maxMessage
                    .replace('{{ value }}', SvarohJsBaseConstraint.formatValue(value))
                    .replace('{{ limit }}', SvarohJsBaseConstraint.formatValue(maxLimit))
            );
        }
        if (!isNaN(min) && subject < min) {
            errors.push(
                this.minMessage
                    .replace('{{ value }}', SvarohJsBaseConstraint.formatValue(value))
                    .replace('{{ limit }}', SvarohJsBaseConstraint.formatValue(minLimit))
            );
        }

        return errors;
    };

    /**
     * Returns the limit to compare with: the "min"/"max" option, or the current
     * value of the field the "minPropertyPath"/"maxPropertyPath" option points
     * to. A date is kept as the string it is, the way "onCreate" keeps a date
     * option; a path pointing outside of the form gives NaN, which leaves that
     * side of the range unchecked here and lets the server report it.
     *
     * @param {Number|String} limit
     * @param {String} propertyPath
     * @param {SvarohJsFormElement} scope
     *
     * @return {Number|String}
     */
    this.getLimit = function (limit, propertyPath, scope) {
        if (!propertyPath) {
            return limit;
        }

        var value = SvarohJsFormValidator.getPropertyPathValue(scope, propertyPath);

        return isNaN(this.toDateNumber(value)) ? parseFloat(value) : value;
    };

    this.onCreate = function () {
        // A date bound stays a string, parseFloat() would cut "2017-06-29" to 2017
        if (isNaN(this.toDateNumber(this.min))) {
            this.min = parseFloat(this.min);
        }
        if (isNaN(this.toDateNumber(this.max))) {
            this.max = parseFloat(this.max);
        }
    }
}

window.SymfonyComponentValidatorConstraintsRange = SymfonyComponentValidatorConstraintsRange;
