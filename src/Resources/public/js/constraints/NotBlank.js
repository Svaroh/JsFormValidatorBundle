//noinspection JSUnusedGlobalSymbols
/**
 * Checks if value is not blank
 * @constructor
 * @author dev.ymalcev@gmail.com
 */
export default function SymfonyComponentValidatorConstraintsNotBlank() {
    this.message = '';
    this.allowNull = false;
    this.normalizer = null;

    this.validate = function (value) {
        // The characters the PHP "trim" function strips off both ends
        var trimmedEdges = /^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g;
        var errors = [];
        var f = SvarohJsFormValidator;

        if (this.allowNull && null === value) {
            return errors;
        }

        // Symfony normalizes a string before it looks at it. Only "trim" makes
        // it to the browser as a name, any other callable is not portable
        if ('trim' === this.normalizer && typeof value === 'string') {
            value = value.replace(trimmedEdges, '');
        }

        if (f.isValueEmty(value)) {
            errors.push(this.message.replace('{{ value }}', SvarohJsBaseConstraint.formatValue(value)));
        }

        return errors;
    }
}

window.SymfonyComponentValidatorConstraintsNotBlank = SymfonyComponentValidatorConstraintsNotBlank;