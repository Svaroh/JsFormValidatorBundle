//noinspection JSUnusedGlobalSymbols
/**
 * Checks if value is a date
 * @constructor
 * @author dev.ymalcev@gmail.com
 */
export default function SymfonyComponentValidatorConstraintsDate() {
    this.message = '';

    this.validate = function (value) {
        var regexp = /^(\d{4})-(\d{2})-(\d{2})$/;
        var errors = [];
        var f = SvarohJsFormValidator;

        if (!f.isValueEmty(value) && !regexp.test(value)) {
            errors.push(this.message.replace('{{ value }}', SvarohJsBaseConstraint.formatValue(value)));
        }

        return errors;
    }
}

window.SymfonyComponentValidatorConstraintsDate = SymfonyComponentValidatorConstraintsDate;