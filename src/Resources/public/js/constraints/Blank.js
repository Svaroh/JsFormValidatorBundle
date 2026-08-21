//noinspection JSUnusedGlobalSymbols,JSUnusedGlobalSymbols
/**
 * Checks if value is blank
 * @constructor
 * @author dev.ymalcev@gmail.com
 */
export default function SymfonyComponentValidatorConstraintsBlank() {
    this.message = '';

    this.validate = function (value) {
        var errors = [];
        var f = SvarohJsFormValidator;

        if (!f.isValueEmty(value)) {
            errors.push(this.message.replace('{{ value }}', SvarohJsBaseConstraint.formatValue(value)));
        }

        return errors;
    }
}

window.SymfonyComponentValidatorConstraintsBlank = SymfonyComponentValidatorConstraintsBlank;