//noinspection JSUnusedGlobalSymbols
/**
 * Checks minimum and maximum length
 * @constructor
 * @author dev.ymalcev@gmail.com
 */
export default function SymfonyComponentValidatorConstraintsLength() {
    this.maxMessage = '';
    this.minMessage = '';
    this.exactMessage = '';
    this.max = null;
    this.min = null;

    this.validate = function (value) {
        var errors = [];
        var f = SvarohJsFormValidator;
        var length = f.getValueLength(value);

        if ('' !== value && null !== length) {
            if (this.max === this.min && length !== this.min) {
                errors.push(this.exactMessage);
                return errors;
            }
            if (!isNaN(this.max) && length > this.max) {
                errors.push(this.maxMessage);
            }
            if (!isNaN(this.min) && length < this.min) {
                errors.push(this.minMessage);
            }
        }

        return errors;
    };

    this.onCreate = function () {
        this.min = parseInt(this.min);
        this.max = parseInt(this.max);

        this.minMessage = SvarohJsBaseConstraint.prepareMessage(
            this.minMessage,
            {'{{ limit }}': SvarohJsBaseConstraint.formatValue(this.min)},
            this.min
        );
        this.maxMessage = SvarohJsBaseConstraint.prepareMessage(
            this.maxMessage,
            {'{{ limit }}': SvarohJsBaseConstraint.formatValue(this.max)},
            this.max
        );
        this.exactMessage = SvarohJsBaseConstraint.prepareMessage(
            this.exactMessage,
            {'{{ limit }}': SvarohJsBaseConstraint.formatValue(this.min)},
            this.min
        );
    }
}

window.SymfonyComponentValidatorConstraintsLength = SymfonyComponentValidatorConstraintsLength;