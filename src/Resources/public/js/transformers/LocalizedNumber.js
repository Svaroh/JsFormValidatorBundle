/**
 * Helpers shared by the transformers that reverse the ICU number formatting
 * Symfony applies to the number, integer, money and percent field types.
 *
 * The formatting rules (separators, symbols, grouping, scale and rounding mode)
 * are exported by the PHP factory, so the locale data never has to be
 * duplicated in JavaScript.
 */

// The \NumberFormatter rounding modes, as exported by the factory.
export var ROUND_CEILING = 0;
export var ROUND_FLOOR = 1;
export var ROUND_DOWN = 2;
export var ROUND_UP = 3;
export var ROUND_HALFEVEN = 4;
export var ROUND_HALFDOWN = 5;
export var ROUND_HALFUP = 6;

// Symfony refuses a parsed value that reaches the PHP integer bounds
export var PHP_INT_MAX = 9223372036854775807;
export var PHP_INT_MIN = -9223372036854775808;

// Locales like "fr" and "ru" group with a (narrow) non breaking space, and the
// formatter accepts a plain space wherever it groups.
var SPACE_SEPARATORS = [' ', '\u00a0', '\u202f'];

// The formatter reads any of these as a minus sign, in every locale, on top of
// the sign the locale itself writes
var MINUS_SIGNS = ['\u2012', '\u2013', '\u207b', '\u2212', '\u2796', '\ufe63', '\uff0d'];

// The characters PHP trims off the remainder of a parsed number
var TRAILING_WHITESPACE = /[ \t\n\r\0\x0b\u00a0]+$/;

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
 * Rejects the values \NumberFormatter would read as "not a number".
 *
 * The percent transformer of Symfony does not carry this check, so it is kept
 * out of the shared parser.
 *
 * @param {*} value
 */
export function assertNotNaN(value) {
    if (-1 !== ['NaN', 'NAN', 'nan'].indexOf(value)) {
        throw new Error('"NaN" is not a valid number.');
    }
}

/**
 * Rewrites the digits of locales such as "ar" and "fa", whose formatter writes
 * a number with a zero digit outside the ASCII range.
 *
 * @param {String} value
 * @param {String} zeroDigit
 *
 * @returns {String}
 */
function toAsciiDigits(value, zeroDigit) {
    var zero = codePointAt(String(zeroDigit || '0'), 0);
    if (48 === zero || isNaN(zero)) {
        return value;
    }

    var result = '';
    for (var i = 0; i < value.length;) {
        // Scripts such as Chakma write their digits outside the basic plane
        var point = codePointAt(value, i);
        var size = point > 0xffff ? 2 : 1;
        var digit = point - zero;

        result += digit >= 0 && digit <= 9 ? String(digit) : value.slice(i, i + size);
        i += size;
    }

    return result;
}

/**
 * @param {String} value
 * @param {Number} index
 *
 * @returns {Number}
 */
function codePointAt(value, index) {
    return value.codePointAt ? value.codePointAt(index) : value.charCodeAt(index);
}

/**
 * Rewrites the minus sign of locales such as "sv" and "fi", which is U+2212,
 * and of the right to left locales, which carry a format mark.
 *
 * Every occurrence is rewritten, so that the sign of an exponent is read too.
 *
 * @param {String} value
 * @param {String} minusSign
 *
 * @returns {String}
 */
function toAsciiMinusSign(value, minusSign) {
    var result = '-' === minusSign || !minusSign ? value : replaceAll(value, minusSign, '-');

    for (var i = 0; i < MINUS_SIGNS.length; i++) {
        result = replaceAll(result, MINUS_SIGNS[i], '-');
    }

    return result;
}

/**
 * Removes the grouping separators, rejecting groups that are not of the size
 * the formatter would have written.
 *
 * @param {String} digits
 * @param {Array} separators
 * @param {Object} options groupingSize and secondaryGroupingSize
 * @param {String} value the original value, for the error message
 *
 * @returns {String}
 */
function ungroup(digits, separators, options, value) {
    if (/^\d*$/.test(digits)) {
        return digits;
    }

    var known = [];
    for (var i = 0; i < separators.length; i++) {
        if (separators[i] && -1 === known.indexOf(separators[i])) {
            known.push(separators[i]);
        }
    }
    if (!known.length) {
        throw transformationFailed(value);
    }

    var alternatives = '(?:';
    for (var j = 0; j < known.length; j++) {
        alternatives += (j ? '|' : '') + escapeRegExp(known[j]);
    }
    alternatives += ')';

    // The locales of the Indian subcontinent write the leading groups with a
    // size of their own, the rightmost one keeping the primary size
    var primary = options.groupingSize > 0 ? options.groupingSize : 3;
    var secondary = options.secondaryGroupingSize > 0 ? options.secondaryGroupingSize : primary;
    var pattern = '^\\d{1,' + secondary + '}(?:' + alternatives + '\\d{' + secondary + '})*'
        + alternatives + '\\d{' + primary + '}$';

    if (!new RegExp(pattern).test(digits)) {
        throw transformationFailed(value);
    }

    return digits.replace(new RegExp(alternatives, 'g'), '');
}

/**
 * Applies the substitutions Symfony makes before it hands the value to the
 * formatter: both "." and "," are accepted as the decimal separator whenever
 * they cannot be confused with the grouping separator.
 *
 * @param {String} value
 * @param {Object} options decimalSeparator, groupingSeparator and grouping
 *
 * @returns {String}
 */
export function substituteDecimalSeparator(value, options) {
    var decimalSeparator = options.decimalSeparator || '.';
    var groupingSeparator = options.groupingSeparator || ',';
    var grouping = Boolean(options.grouping);
    var result = String(value);

    if ('.' !== decimalSeparator && (!grouping || '.' !== groupingSeparator)) {
        result = replaceAll(result, '.', decimalSeparator);
    }
    if (',' !== decimalSeparator && (!grouping || ',' !== groupingSeparator)) {
        result = replaceAll(result, ',', decimalSeparator);
    }

    return result;
}

/**
 * Whether the value carries the decimal separator once the substitutions are
 * applied. Symfony reads a value without one as an integer.
 *
 * @param {*} value
 * @param {Object} options
 *
 * @returns {Boolean}
 */
export function containsDecimalSeparator(value, options) {
    if (typeof value !== 'string') {
        return false;
    }

    return -1 !== substituteDecimalSeparator(value, options)
        .indexOf(options.decimalSeparator || '.');
}

/**
 * Parses a value formatted for the current locale into a number.
 *
 * @param {*} value
 * @param {Object} options the conventions exported by the factory
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
    if ('' === value) {
        return null;
    }

    var decimalSeparator = options.decimalSeparator || '.';
    var groupingSeparator = options.groupingSeparator || ',';
    var grouping = Boolean(options.grouping);

    // The formatter stops on a leading space, but PHP trims the remainder it
    // did not read, so a trailing one is accepted
    var number = value.replace(TRAILING_WHITESPACE, '');
    if ('' === number) {
        throw transformationFailed(value);
    }

    number = toAsciiDigits(number, options.zeroDigit);
    number = toAsciiMinusSign(number, options.minusSign);
    number = substituteDecimalSeparator(number, options);

    var sign = '';
    if ('-' === number.charAt(0)) {
        sign = '-';
        number = number.substring(1);
    }

    var exponent = '';
    var exponentMatch = number.match(exponentPattern(options.exponentSymbol));
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
        options,
        value
    );

    var result = parseFloat(sign + (integerPart || '0') + '.' + (fractionPart || '0') + exponent);
    if (!isFinite(result)) {
        throw new Error('I don\'t have a clear idea what infinity looks like.');
    }

    return result;
}

/**
 * Symfony asks the formatter for an integer whenever the value carries no
 * decimal separator, which truncates a fraction written with an exponent. The
 * number transformer excludes a negative ASCII exponent from that rule; its
 * percent counterpart carries no such check.
 *
 * @param {*} value
 * @param {Object} options
 * @param {Boolean} exceptNegativeExponent
 *
 * @returns {Boolean}
 */
export function readsAsInteger(value, options, exceptNegativeExponent) {
    if (containsDecimalSeparator(value, options)) {
        return false;
    }

    return !exceptNegativeExponent || -1 === String(value).toLowerCase().indexOf('e-');
}

/**
 * The number transformer refuses a value that reaches the PHP integer bounds.
 *
 * @param {Number} number
 *
 * @returns {Number}
 */
export function assertWithinIntegerRange(number) {
    if (number >= PHP_INT_MAX || number <= PHP_INT_MIN) {
        throw new Error('I don\'t have a clear idea what infinity looks like.');
    }

    return number;
}

/**
 * The exponent separator is a locale symbol: "E" for most locales, but "×10^"
 * for "sv" for instance. The formatter compares it without regard to the case.
 *
 * @param {String} symbol
 *
 * @returns {RegExp}
 */
function exponentPattern(symbol) {
    return new RegExp(escapeRegExp(symbol || 'E') + '([+-]?\\d+)$', 'i');
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

        case ROUND_HALFUP:
            rounded = roundHalf(shifted, true);
            break;

        // PHP has no arm for any other mode, where it raises an \UnhandledMatchError
        default:
            throw new Error('Unsupported rounding mode "' + roundingMode + '".');
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
