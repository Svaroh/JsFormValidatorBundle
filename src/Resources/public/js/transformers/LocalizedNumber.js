/**
 * Helpers shared by the transformers that reverse the ICU number formatting
 * Symfony applies to the number, integer, money and percent field types.
 *
 * The formatting rules (separators, grouping, scale and rounding mode) are
 * exported by the PHP factory, so the locale data never has to be duplicated
 * in JavaScript.
 */

// The \NumberFormatter rounding modes, as exported by the factory.
export var ROUND_CEILING = 0;
export var ROUND_FLOOR = 1;
export var ROUND_DOWN = 2;
export var ROUND_UP = 3;
export var ROUND_HALFEVEN = 4;
export var ROUND_HALFDOWN = 5;
export var ROUND_HALFUP = 6;

// Locales like "fr" and "ru" group with a (narrow) non breaking space, and the
// formatter accepts a plain space wherever it groups.
var SPACE_SEPARATORS = [' ', '\u00a0', '\u202f'];

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\\-]/g, '\\$&');
}

function replaceAll(value, search, replacement) {
    if (undefined === search || null === search || '' === search) {
        return value;
    }

    return value.split(search).join(replacement);
}

function transformationFailed(value) {
    return new Error('The number contains unrecognized characters: "' + value + '".');
}

/**
 * PHP casts to string before rounding to hide the float representation errors,
 * "precision" being 14 digits by default.
 *
 * @param {Number} value
 *
 * @returns {Number}
 */
export function toPhpPrecision(value) {
    if (!isFinite(value) || 0 === value) {
        return value;
    }

    return parseFloat(value.toPrecision(14));
}

/**
 * Truncates towards zero, the way PHP casts a float to an integer.
 *
 * @param {Number} value
 *
 * @returns {Number}
 */
export function toInteger(value) {
    return value < 0 ? Math.ceil(value) : Math.floor(value);
}

/**
 * Removes the grouping separators, rejecting groups that are not made of the
 * three digits the formatter would have written.
 *
 * @param {String} digits
 * @param {Array} separators
 * @param {String} value the original value, for the error message
 *
 * @returns {String}
 */
function ungroup(digits, separators, value) {
    if (/^\d*$/.test(digits)) {
        return digits;
    }

    var known = [];
    for (var i = 0; i < separators.length; i++) {
        if (separators[i] && -1 === known.indexOf(separators[i])) {
            known.push(escapeRegExp(separators[i]));
        }
    }
    if (!known.length) {
        throw transformationFailed(value);
    }

    var alternatives = '(?:' + known.join('|') + ')';
    if (!new RegExp('^\\d{1,3}(?:' + alternatives + '\\d{3})+$').test(digits)) {
        throw transformationFailed(value);
    }

    return digits.replace(new RegExp(alternatives, 'g'), '');
}

/**
 * Parses a value formatted for the current locale into a number.
 *
 * @param {*} value
 * @param {Object} options decimalSeparator, groupingSeparator and grouping
 *
 * @returns {Number|null}
 */
export function parseLocalizedNumber(value, options) {
    if (null === value || undefined === value) {
        return null;
    }
    if (typeof value !== 'string') {
        throw new Error('Expected a string.');
    }

    var decimalSeparator = options.decimalSeparator || '.';
    var groupingSeparator = options.groupingSeparator || ',';
    var grouping = Boolean(options.grouping);
    var number = value.replace(/^\s+/, '').replace(/\s+$/, '');

    if ('' === number) {
        return null;
    }
    if (-1 !== ['NaN', 'NAN', 'nan'].indexOf(number)) {
        throw new Error('"NaN" is not a valid number.');
    }

    // Both "." and "," are accepted as the decimal separator whenever they
    // cannot be confused with the grouping separator, as Symfony does
    if ('.' !== decimalSeparator && (!grouping || '.' !== groupingSeparator)) {
        number = replaceAll(number, '.', decimalSeparator);
    }
    if (',' !== decimalSeparator && (!grouping || ',' !== groupingSeparator)) {
        number = replaceAll(number, ',', decimalSeparator);
    }

    var sign = '';
    if ('-' === number.charAt(0)) {
        sign = '-';
        number = number.substring(1);
    }

    var exponent = '';
    var exponentMatch = number.match(/[eE]([+-]?\d+)$/);
    if (exponentMatch) {
        exponent = 'e' + exponentMatch[1];
        number = number.substring(0, number.length - exponentMatch[0].length);
    }

    var position = number.indexOf(decimalSeparator);
    var integerPart = -1 === position ? number : number.substring(0, position);
    var fractionPart = -1 === position ? '' : number.substring(position + decimalSeparator.length);

    if (!/^\d*$/.test(fractionPart) || ('' === integerPart && '' === fractionPart)) {
        throw transformationFailed(value);
    }

    integerPart = ungroup(
        integerPart,
        grouping ? [groupingSeparator].concat(SPACE_SEPARATORS) : [],
        value
    );

    var result = parseFloat(sign + (integerPart || '0') + '.' + (fractionPart || '0') + exponent);
    if (!isFinite(result)) {
        throw new Error('I don\'t have a clear idea what infinity looks like.');
    }

    return result;
}

/**
 * Rounds a number shifted by the given coefficient, then shifts it back.
 *
 * @param {Number} number
 * @param {Number} coefficient
 * @param {Number} roundingMode
 *
 * @returns {Number}
 */
export function applyRounding(number, coefficient, roundingMode) {
    var shifted = toPhpPrecision(number * coefficient);
    var rounded;

    switch (roundingMode) {
        case ROUND_CEILING:
            rounded = Math.ceil(shifted);
            break;

        case ROUND_FLOOR:
            rounded = Math.floor(shifted);
            break;

        case ROUND_UP:
            rounded = shifted > 0 ? Math.ceil(shifted) : Math.floor(shifted);
            break;

        case ROUND_DOWN:
            rounded = shifted > 0 ? Math.floor(shifted) : Math.ceil(shifted);
            break;

        case ROUND_HALFEVEN:
            rounded = roundHalf(shifted, null);
            break;

        case ROUND_HALFDOWN:
            rounded = roundHalf(shifted, false);
            break;

        default:
            rounded = roundHalf(shifted, true);
            break;
    }

    return 1 === coefficient ? rounded : rounded / coefficient;
}

/**
 * @param {Number} value
 * @param {Boolean|null} awayFromZero null rounds a half to the even neighbour
 *
 * @returns {Number}
 */
function roundHalf(value, awayFromZero) {
    var sign = value < 0 ? -1 : 1;
    var abs = Math.abs(value);
    var integerPart = Math.floor(abs);
    var fraction = abs - integerPart;
    var result;

    if (fraction > 0.5) {
        result = integerPart + 1;
    } else if (fraction < 0.5) {
        result = integerPart;
    } else if (null === awayFromZero) {
        result = 0 === integerPart % 2 ? integerPart : integerPart + 1;
    } else {
        result = awayFromZero ? integerPart + 1 : integerPart;
    }

    return sign * result;
}

/**
 * Rounds a number according to the configured scale and rounding mode.
 *
 * @param {Number} number
 * @param {Number|null} scale
 * @param {Number} roundingMode
 *
 * @returns {Number}
 */
export function roundToScale(number, scale, roundingMode) {
    if (null === scale || undefined === scale) {
        return number;
    }

    return applyRounding(number, Math.pow(10, scale), roundingMode);
}
