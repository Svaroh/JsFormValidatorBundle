//noinspection JSUnusedGlobalSymbols
/**
 * Checks if value matches to the predefined regexp
 * @constructor
 * @author dev.ymalcev@gmail.com
 */
export default function SymfonyComponentValidatorConstraintsRegex() {
    this.message = '';
    this.pattern = '';
    this.match = true;

    this.validate = function(value) {
        var errors = [];
        var f = SvarohJsFormValidator;

        if (!f.isValueEmty(value)) {
            // A "g" or "y" flagged regexp keeps its own lastIndex between the
            // test() calls, so reset it to not depend on the previous call
            if (this.pattern.global || this.pattern.sticky) {
                this.pattern.lastIndex = 0;
            }

            // When the "match" option is false - the value is invalid if it matches the pattern
            if (this.pattern.test(value) !== (false !== this.match)) {
                errors.push(this.message.replace('{{ value }}', SvarohJsBaseConstraint.formatValue(value)));
            }
        }

        return errors;
    };

    this.onCreate = function() {
        var flags = this.pattern.match(/[\/#](\w*)$/);
        this.pattern = new RegExp(this.pattern.trim().replace(/(^[\/#])|([\/#]\w*$)/g, ''), flags[1]);
    }
}

window.SymfonyComponentValidatorConstraintsRegex = SymfonyComponentValidatorConstraintsRegex;