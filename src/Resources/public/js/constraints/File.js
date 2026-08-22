var KB_BYTES = 1000;
var MB_BYTES = 1000000;
var KIB_BYTES = 1024;
var MIB_BYTES = 1048576;

var SUFFICES = {
    1: 'bytes',
    1000: 'kB',
    1000000: 'MB',
    1024: 'KiB',
    1048576: 'MiB'
};

/**
 * @param {Number} value
 * @param {Number} precision
 *
 * @return {Number}
 */
function round(value, precision) {
    var factor = Math.pow(10, precision);

    return Math.round(value * factor) / factor;
}

/**
 * @param {String} value
 * @param {Number} numberOfDecimals
 *
 * @return {Boolean}
 */
function moreDecimalsThan(value, numberOfDecimals) {
    return value.length > String(round(Number(value), numberOfDecimals)).length;
}

/**
 * Convert the limit to the smallest possible number the same way
 * Symfony\Component\Validator\Constraints\FileValidator does
 *
 * @param {Number}  size
 * @param {Number}  limit
 * @param {Boolean} binaryFormat
 *
 * @return {Array} the size, the limit and the suffix they are expressed in
 */
function factorizeSizes(size, limit, binaryFormat) {
    var coef = binaryFormat ? MIB_BYTES : MB_BYTES;
    var coefFactor = binaryFormat ? KIB_BYTES : KB_BYTES;

    // A limit below the coefficient would be displayed as a value lower than
    // one, so keep on factorizing
    while (limit < coef) {
        coef /= coefFactor;
    }

    var limitAsString = String(limit / coef);

    // Restrict the limit to 2 decimals, without rounding it
    while (coef > 1 && moreDecimalsThan(limitAsString, 2)) {
        coef /= coefFactor;
        limitAsString = String(limit / coef);
    }

    var sizeAsString = String(round(size / coef, 2));

    // If rounding makes the size and the limit look the same, reduce the
    // coefficient
    while (coef > 1 && sizeAsString === limitAsString) {
        coef /= coefFactor;
        limitAsString = String(limit / coef);
        sizeAsString = String(round(size / coef, 2));
    }

    return [sizeAsString, limitAsString, SUFFICES[coef]];
}

/**
 * @param {Array} values
 *
 * @return {String}
 */
function formatValues(values) {
    var formatted = [];
    for (var i = 0; i < values.length; i++) {
        formatted.push(SvarohJsBaseConstraint.formatValue(values[i]));
    }

    return formatted.join(', ');
}

//noinspection JSUnusedGlobalSymbols
/**
 * Checks the selected files against the options a browser can evaluate
 *
 * The File API only exposes the name, the size and a sniffed mime type of a
 * file. Everything that needs the real content of the file - the mime type of
 * an unknown extension, the readability of a path, the upload errors - stays
 * on the server side and is reported after the form is submitted.
 *
 * @constructor
 */
export default function SymfonyComponentValidatorConstraintsFile() {
    this.maxSize = null;
    this.binaryFormat = false;
    this.mimeTypes = [];
    this.extensions = [];
    this.filenameMaxLength = null;
    this.filenameCountUnit = 'bytes';

    this.maxSizeMessage = '';
    this.mimeTypesMessage = '';
    this.extensionsMessage = '';
    this.disallowEmptyMessage = '';
    this.filenameTooLongMessage = '';

    this.validate = function (value) {
        var errors = [];
        var files = this.getFiles(value);

        for (var i = 0; i < files.length; i++) {
            errors = errors.concat(this.validateFile(files[i]));
        }

        return errors;
    };

    /**
     * @param {File} file
     *
     * @return {Array}
     */
    this.validateFile = function (file) {
        var name = SvarohJsBaseConstraint.formatValue(file.name);
        var errors = [];

        if (this.filenameMaxLength && this.filenameMaxLength < this.getFilenameLength(file.name)) {
            return [SvarohJsBaseConstraint.prepareMessage(
                this.filenameTooLongMessage,
                {'{{ filename_max_length }}': SvarohJsBaseConstraint.formatValue(this.filenameMaxLength)},
                this.filenameMaxLength
            )];
        }

        if (!file.size) {
            return [SvarohJsBaseConstraint.prepareMessage(
                this.disallowEmptyMessage,
                {'{{ file }}': name, '{{ name }}': name}
            )];
        }

        if (this.maxSize && file.size > this.maxSize) {
            var sizes = factorizeSizes(file.size, this.maxSize, this.binaryFormat);

            return [SvarohJsBaseConstraint.prepareMessage(this.maxSizeMessage, {
                '{{ file }}': name,
                '{{ size }}': sizes[0],
                '{{ limit }}': sizes[1],
                '{{ suffix }}': sizes[2],
                '{{ name }}': name
            })];
        }

        // Symfony reports an unexpected extension and still checks the mime
        // type afterwards
        var extensions = this.getExtensions();
        if (extensions.length && -1 === extensions.indexOf(this.getFileExtension(file.name))) {
            errors.push(SvarohJsBaseConstraint.prepareMessage(this.extensionsMessage, {
                '{{ file }}': name,
                '{{ extension }}': SvarohJsBaseConstraint.formatValue(this.getFileExtension(file.name)),
                '{{ extensions }}': formatValues(extensions),
                '{{ name }}': name
            }));
        }

        var mimeTypes = this.getMimeTypes();
        // An empty type means the browser could not sniff one, the server has
        // the last word on it anyway
        if (mimeTypes.length && file.type && !this.matchesMimeTypes(file.type, mimeTypes)) {
            errors.push(SvarohJsBaseConstraint.prepareMessage(this.mimeTypesMessage, {
                '{{ file }}': name,
                '{{ type }}': SvarohJsBaseConstraint.formatValue(file.type),
                '{{ types }}': formatValues(mimeTypes),
                '{{ name }}': name
            }));
        }

        return errors;
    };

    /**
     * Only the values the File API describes can be validated here
     *
     * @param {*} value
     *
     * @return {Array}
     */
    this.getFiles = function (value) {
        if (this.isFile(value)) {
            return [value];
        }

        var files = [];
        if (value instanceof Array) {
            for (var i = 0; i < value.length; i++) {
                if (this.isFile(value[i])) {
                    files.push(value[i]);
                }
            }
        }

        return files;
    };

    /**
     * @param {*} value
     *
     * @return {Boolean}
     */
    this.isFile = function (value) {
        return null !== value
            && 'object' == typeof value
            && 'number' == typeof value.size
            && 'string' == typeof value.name;
    };

    /**
     * @param {String} mime
     * @param {Array}  mimeTypes
     *
     * @return {Boolean}
     */
    this.matchesMimeTypes = function (mime, mimeTypes) {
        var discrete = mime.substring(0, mime.indexOf('/'));

        for (var i = 0; i < mimeTypes.length; i++) {
            if (mimeTypes[i] === mime) {
                return true;
            }
            // A "type/*" mime type accepts every subtype of that type
            var wildcard = mimeTypes[i].indexOf('/*');
            if (wildcard > 0 && discrete === mimeTypes[i].substring(0, wildcard)) {
                return true;
            }
        }

        return false;
    };

    /**
     * @param {String} filename
     *
     * @return {String}
     */
    this.getFileExtension = function (filename) {
        var dot = filename.lastIndexOf('.');

        return -1 === dot ? '' : filename.substring(dot + 1).toLowerCase();
    };

    /**
     * The option holds either a list of extensions or a map of extensions to
     * the mime types they allow, the same way the PHP option does
     *
     * @return {Array}
     */
    this.getExtensions = function () {
        var extensions = [];
        for (var key in this.extensions) {
            if (this.extensions.hasOwnProperty(key)) {
                // A numeric key means the extension is stored as the value
                extensions.push(String(parseInt(key, 10)) === String(key) ? this.extensions[key] : key);
            }
        }

        return extensions;
    };

    /**
     * @return {Array}
     */
    this.getMimeTypes = function () {
        if ('string' == typeof this.mimeTypes) {
            return [this.mimeTypes];
        }

        return this.mimeTypes instanceof Array ? this.mimeTypes : [];
    };

    /**
     * @param {String} filename
     *
     * @return {Number}
     */
    this.getFilenameLength = function (filename) {
        if ('codepoints' === this.filenameCountUnit) {
            return this.countCodePoints(filename);
        }
        if ('graphemes' === this.filenameCountUnit) {
            return this.countGraphemes(filename);
        }

        return this.countBytes(filename);
    };

    /**
     * Length of the UTF-8 representation of the string
     *
     * @param {String} value
     *
     * @return {Number}
     */
    this.countBytes = function (value) {
        var bytes = 0;
        for (var i = 0; i < value.length; i++) {
            var code = value.charCodeAt(i);
            if (code < 0x80) {
                bytes += 1;
            } else if (code < 0x800) {
                bytes += 2;
            } else if (code >= 0xD800 && code <= 0xDBFF && i + 1 < value.length) {
                bytes += 4;
                i++;
            } else {
                bytes += 3;
            }
        }

        return bytes;
    };

    /**
     * @param {String} value
     *
     * @return {Number}
     */
    this.countCodePoints = function (value) {
        var count = 0;
        for (var i = 0; i < value.length; i++) {
            var code = value.charCodeAt(i);
            if (code >= 0xD800 && code <= 0xDBFF && i + 1 < value.length) {
                i++;
            }
            count++;
        }

        return count;
    };

    /**
     * Falls back to the code point count where the browser cannot segment
     * graphemes
     *
     * @param {String} value
     *
     * @return {Number}
     */
    this.countGraphemes = function (value) {
        if ('undefined' == typeof Intl || 'function' != typeof Intl.Segmenter) {
            return this.countCodePoints(value);
        }

        return Array.from(new Intl.Segmenter(undefined, {granularity: 'grapheme'}).segment(value)).length;
    };

    this.onCreate = function () {
        this.maxSize = parseInt(this.maxSize, 10);
        if (isNaN(this.maxSize)) {
            this.maxSize = null;
        }
        this.filenameMaxLength = parseInt(this.filenameMaxLength, 10);
        if (isNaN(this.filenameMaxLength)) {
            this.filenameMaxLength = null;
        }
    }
}

window.SymfonyComponentValidatorConstraintsFile = SymfonyComponentValidatorConstraintsFile;
