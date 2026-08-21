//noinspection JSUnusedGlobalSymbols
/**
 * Checks if values is like an email address
 * @constructor
 * @author dev.ymalcev@gmail.com
 */
export default function SymfonyComponentValidatorConstraintsEmail() {
    this.message = '';

    this.validate = function (value) {
        var regexp = /^[-a-z0-9~!$%^&*_=+}{'?]+(\.[-a-z0-9~!$%^&*_=+}{'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.([a-z]+)|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;
        var errors = [];
        var f = SvarohJsFormValidator;

        if (!f.isValueEmty(value) && !regexp.test(value)) {
            errors.push(this.message.replace('{{ value }}', SvarohJsBaseConstraint.formatValue(value)));
        }

        return errors;
    }
}

window.SymfonyComponentValidatorConstraintsEmail = SymfonyComponentValidatorConstraintsEmail;