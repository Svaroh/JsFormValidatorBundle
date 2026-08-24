/**
 * The character classes behind the PHP ctype_*() functions in the "C" locale.
 * PHP applies them to every single character of the string, so an empty string,
 * a sign, a decimal separator or any surrounding whitespace makes them fail.
 * @type {Object.<String, RegExp>}
 */
var ctypePatterns = {
    'alnum':  /^[0-9A-Za-z]+$/,
    'alpha':  /^[A-Za-z]+$/,
    'cntrl':  /^[\x00-\x1F\x7F]+$/,
    'digit':  /^[0-9]+$/,
    'graph':  /^[\x21-\x7E]+$/,
    'lower':  /^[a-z]+$/,
    'print':  /^[\x20-\x7E]+$/,
    'punct':  /^[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]+$/,
    'space':  /^[\x09-\x0D\x20]+$/,
    'upper':  /^[A-Z]+$/,
    'xdigit': /^[0-9A-Fa-f]+$/
};

//noinspection JSUnusedGlobalSymbols
/**
 * Checks the value type
 * @constructor
 * @author dev.ymalcev@gmail.com
 */
export default function SymfonyComponentValidatorConstraintsType() {
    this.message = '';
    this.type = '';

    this.validate = function(value) {
        // Symfony's TypeValidator returns before any check when the value is
        // null, leaving an empty field to NotNull and NotBlank. The reverse
        // transformer of a number, integer, money or percent field turns an
        // empty input into null, which every type would otherwise reject.
        if (null === value || '' === value) {
            return [];
        }

        var errors = [];
        var isValid = false;

        switch (this.type) {
            case 'array':
                isValid = (value instanceof Array);
                break;

            case 'bool':
            case 'boolean':
                isValid = (typeof value === 'boolean');
                break;

            case 'callable':
                isValid = (typeof value === 'function');
                break;

            case 'float':
            case 'double':
            case 'real':
                isValid = typeof value === 'number' && value % 1 != 0;
                break;

            case 'int':
            case 'integer':
            case 'long':
                isValid = (value === parseInt(value));
                break;

            case 'null':
                isValid = (null === value);
                break;

            case 'numeric':
                isValid = !isNaN(value);
                break;

            case 'object':
                isValid = (null !== value) && (typeof value === 'object');
                break;

            case 'scalar':
                isValid = (/boolean|number|string/).test(typeof value);
                break;

            case '':
            case 'string':
                isValid = (typeof value === 'string');
                break;

            // The ctype_*() based types. PHP only ever passes a string to them,
            // any other type is rejected, and a single character outside of the
            // class is enough to make the whole value invalid.
            case 'alnum':
            case 'alpha':
            case 'cntrl':
            case 'digit':
            case 'graph':
            case 'lower':
            case 'print':
            case 'punct':
            case 'space':
            case 'upper':
            case 'xdigit':
                isValid = (typeof value === 'string') && ctypePatterns[this.type].test(value);
                break;

            // It doesn't have an implementation in javascript
            case 'resource':
                isValid = true;
                break;

            // Symfony accepts more types than the browser can check: iterable,
            // countable, list, associative_array and any class name for an
            // instanceof test. Leave them to the server side validation instead
            // of throwing, which would abort the whole form submission.
            default:
                isValid = true;
                break;
        }

        if (!isValid) {
            errors.push(
                this.message
                    .replace('{{ value }}', SvarohJsBaseConstraint.formatValue(value))
                    .replace('{{ type }}', this.type)
            );
        }

        return errors;
    }
}

window.SymfonyComponentValidatorConstraintsType = SymfonyComponentValidatorConstraintsType;