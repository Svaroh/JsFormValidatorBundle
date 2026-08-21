if(window.jQuery) {
    (function($) {
        $.fn.jsFormValidator = function(method) {
            if (!method) {
                return SvarohJsFormValidator.customizeMethods.get.apply($.makeArray(this), arguments);
            } else if (typeof method === 'object') {
                return $(SvarohJsFormValidator.customizeMethods.init.apply($.makeArray(this), arguments));
            } else if (SvarohJsFormValidator.customizeMethods[method]) {
                return SvarohJsFormValidator.customizeMethods[method].apply($.makeArray(this), Array.prototype.slice.call(arguments, 1));
            } else {
                $.error('Method ' + method + ' does not exist');
                return this;
            }
        };
    })(jQuery);
}
