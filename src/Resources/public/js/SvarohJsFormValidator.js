import './constraints';
import './transformers';

// The Unicode separators (\p{Z}), controls (\p{Cc}) and format characters
// (\p{Cf}) that Symfony strips off both ends of a submitted string
var TRIMMED = '\\s\\u0000-\\u001f\\u007f-\\u00a0\\u00ad\\u0600-\\u0605\\u061c\\u06dd\\u070f'
    + '\\u0890-\\u0891\\u08e2\\u180e\\u200b-\\u200f\\u2028\\u2029\\u202a-\\u202f'
    + '\\u205f-\\u2064\\u2066-\\u206f\\u3000\\ufeff\\ufff9-\\ufffb';
var TRIMMED_EDGES = new RegExp('^[' + TRIMMED + ']+|[' + TRIMMED + ']+$', 'g');

export function SvarohJsFormError(message) {
    this.message = message;
    this.atPath = null;

    this.getTarget = function(rootElement) {
        if (!this.atPath) {
            return rootElement;
        }

        var path = String(this.atPath).split('.');
        var targetElement = rootElement;

        for (var index = 0; index < path.length; index++) {
            var pathSegment = path[index];
            if (!pathSegment) {
                continue;
            }

            if (!targetElement.children || !targetElement.children[pathSegment]) {
                return rootElement;
            }

            targetElement = targetElement.children[pathSegment];
        }

        return targetElement || rootElement;
    };
}

export function SvarohJsFormElement() {
    this.id = '';
    this.name = '';
    this.type = '';
    this.invalidMessage = '';
    this.trim = true;
    this.bubbling = false;
    this.disabled = false;
    this.transformers = [];
    this.data = {};
    this.children = {};
    this.parent = null;
    this.domNode = null;

    this.callbacks = {};
    this.errors = {};

    this.groups = function () {
        return ['Default'];
    };

    this.validate = function () {
        var self = this;
        var sourceId = 'form-error-' + String(this.id).replace(/_/g, '-');
        self.clearErrorsRecursively(sourceId);

        if (this.disabled) {
            return true;
        }

        // The browser is asked first, while its own diagnosis is still
        // readable: the message of this element is written back into the
        // "customError" state the browser would otherwise answer with
        var nativeErrors = SvarohJsFormValidator.validateNative(self);
        var validationErrors = SvarohJsFormValidator.validateElement(self);
        var invalidTargets = [];
        for (var index = 0; index < validationErrors.length; index++) {
            var validationError = validationErrors[index];
            var errorTarget = validationError.getTarget
                ? validationError.getTarget(self)
                : self;
            if (!errorTarget) {
                errorTarget = self;
            }

            if (-1 === invalidTargets.indexOf(errorTarget)) {
                invalidTargets.push(errorTarget);
            }

            if (!errorTarget.errors[sourceId]) {
                errorTarget.errors[sourceId] = [];
            }

            errorTarget.errors[sourceId].push(validationError.message);
        }

        // A "required" attribute and a NotBlank constraint describe the same
        // failure, so a value the browser only calls missing is left to the
        // constraint, whose message is the translated one. Anything else the
        // browser diagnosed - a "type=email" it cannot parse, a "number" the
        // user filled with letters, a value outside "min", "max" or "step" -
        // is a different failure and is reported even when a constraint
        // already spoke about the element
        var nativeIsAlreadyDescribed = nativeErrors.length
            && nativeErrors[0].describesTheSameFailureAsNotBlank
            && -1 !== invalidTargets.indexOf(self);
        if (nativeErrors.length && !nativeIsAlreadyDescribed) {
            if (-1 === invalidTargets.indexOf(self)) {
                invalidTargets.push(self);
            }

            if (!self.errors[sourceId]) {
                self.errors[sourceId] = [];
            }

            self.errors[sourceId].push(nativeErrors[0].message);
            validationErrors = validationErrors.concat(nativeErrors);
        }

        if (-1 === invalidTargets.indexOf(self)) {
            SvarohJsFormValidator.syncNativeValidity(self, sourceId);
        }

        for (var i = 0; i < invalidTargets.length; i++) {
            var target = invalidTargets[i];
            var errorPath = SvarohJsFormValidator.getErrorPathElement(target);
            var domNode = SvarohJsFormValidator.findErrorDomNode(errorPath);
            if (domNode) {
                errorPath.showErrors.apply(domNode, [target.errors[sourceId], sourceId]);
            }

            SvarohJsFormValidator.syncNativeValidity(target, sourceId);
        }

        return validationErrors.length === 0;
    };

    this.validateRecursively = function () {
        var isValid = this.validate();

        // Every child is validated, even after a failure, so that all the
        // errors of the subtree are collected and displayed at once.
        for (var childName in this.children) {
            if (!this.children[childName].validateRecursively()) {
                isValid = false;
            }
        }

        return isValid;
    };

    this.isValid = function () {
        for (var id in this.errors) {
            if (this.errors[id].length > 0) {
                return false;
            }
        }

        for (var childName in this.children) {
            if (!this.children[childName].isValid()) {
                return false;
            }
        }

        return true;
    };

    this.clearErrors = function(sourceId) {
        if (!sourceId) {
            for (sourceId in this.errors) {
                this.clearErrors(sourceId);
            }

            // An element that never collected an error has nothing to loop
            // over, and its mirrored state still has to be dropped
            SvarohJsFormValidator.syncNativeValidity(this);
        } else {
            this.errors[sourceId] = [];
            var domNode = SvarohJsFormValidator.findErrorDomNode(this);
            if (domNode) {
                this.showErrors.apply(domNode, [this.errors[sourceId], sourceId]);
            }

            SvarohJsFormValidator.syncNativeValidity(this, sourceId);
        }
    };

    this.clearErrorsRecursively = function (sourceId) {
        this.clearErrors(sourceId);
        for (var childName in this.children) {
            this.children[childName].clearErrorsRecursively(sourceId);
        }
    };

    this.showErrors = function (errors, sourceId) {
        if (!(this instanceof HTMLElement)) {
            return;
        }
        //noinspection JSValidateTypes
        /**
         * @type {HTMLElement}
         */
        var domNode = this;
        var ul = SvarohJsFormValidator.getDefaultErrorContainerNode(domNode);
        if (ul) {
            var len = ul.childNodes.length;
            while (len--) {
                if (sourceId == ul.childNodes[len].className) {
                    ul.removeChild(ul.childNodes[len]);
                }
            }
        }

        if (!errors.length) {
            if (ul && !ul.childNodes) {
                ul.parentNode.removeChild(ul);
            }
            return;
        }

        if (!ul) {
            ul = document.createElement('ul');
            ul.className = SvarohJsFormValidator.errorClass;
            domNode.parentNode.insertBefore(ul, domNode);
        }

        var li;
        for (var i in errors) {
            li = document.createElement('li');
            li.className = sourceId;
            li.innerHTML = errors[i];
            ul.appendChild(li);
        }
    };

    this.onValidate = function (errors, event) {
    };

    this.submitForm = function (form) {
        form.submit();
    };
}

function SvarohJsAjaxRequest() {
    this.queue = 0;
    this.callbacks = [];

    this.sendRequest = function (path, data, callback) {
        var self = this;
        var request = this.createRequest();

        try {
            request.open("POST", path, true);
            request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            request.onreadystatechange = function () {
                if (4 != request.readyState) {
                    return;
                }

                if (200 == request.status) {
                    callback(request.responseText);
                }

                // The queue drains on every finished request, a refused one
                // included. A lookup the endpoint does not answer would
                // otherwise leave the queue up for good, and a submit that
                // waits for it would never happen
                self.queue--;
                self.checkQueue();
            };

            request.send(this.serializeData(data, null));
            self.queue++;
        } catch (e) {
            console.log(e.message);
        }
    };

    this.checkQueue = function () {
        if (0 != this.queue) {
            return;
        }

        // Every callback waits for one drain of the queue; keeping them around
        // would run the submit of a previous form again on the next drain
        var callbacks = this.callbacks;
        this.callbacks = [];
        for (var i in callbacks) {
            callbacks[i]();
        }
    };

    this.serializeData = function (obj, prefix) {
        var queryParts = [];
        for (var paramName in obj) {
            var key = prefix
                ? prefix + "[" + paramName + "]"
                : paramName;

            var child = obj[paramName];

            queryParts.push(
                (typeof child == "object")
                    ? this.serializeData(child, key)
                    : encodeURIComponent(key) + "=" + encodeURIComponent(child)
            );
        }

        return queryParts.join("&");
    };

    /**
     * @return {XMLHttpRequest}
     */
    this.createRequest = function () {
        var request = null;
        if (window.XMLHttpRequest) {
            //IE7+, Firefox, Chrome, Opera, Safari
            request = new XMLHttpRequest();
        } else {
            //IE6, IE5
            try {
                request = new ActiveXObject("Microsoft.XMLHTTP");
            } catch (e) {
            }
            try {
                request = new ActiveXObject("Msxml2.XMLHTTP");
            } catch (e) {
            }
            try {
                request = new ActiveXObject("Msxml2.XMLHTTP.6.0");
            } catch (e) {
            }
            try {
                request = new ActiveXObject("Msxml2.XMLHTTP.3.0");
            } catch (e) {
            }
        }

        return request;
    };
}

function SvarohJsCustomizeMethods() {
    this.init = function (options) {
        SvarohJsFormValidator.each(this, function (item) {
            if (!item.jsFormValidator) {
                item.jsFormValidator = {};
            }

            for (var optName in options) {
                switch (optName) {
                    case 'customEvents':
                        options[optName].apply(item);
                        break;
                    default:
                        item.jsFormValidator[optName] = options[optName];
                        break;
                }
            }
        }, false);

        return this;
    };

    this.validate = function (opts) {
        var isValid = true;
        //noinspection JSCheckFunctionSignatures
        SvarohJsFormValidator.each(this, function (item) {
            var method = (opts && true === opts['recursive'])
                ? 'validateRecursively'
                : 'validate';

            var validateUnique = (!opts || false !== opts['findUniqueConstraint']);
            if (validateUnique && item.jsFormValidator.parent) {
                var data = item.jsFormValidator.parent.data;
                if (data['entity'] && data['entity']['constraints']) {
                    for (var i in data['entity']['constraints']) {
                        var constraint = data['entity']['constraints'][i];
                        if (constraint instanceof SvarohJsFormValidatorBundleFormConstraintUniqueEntity && constraint.fields.indexOf(item.jsFormValidator.name) > -1) {
                            var owner = item.jsFormValidator.parent;
                            constraint.validate(null, owner);
                        }
                    }
                }
            }

            if (!item.jsFormValidator[method]()) {
                isValid = false;
            }
        });

        return isValid;
    };

    this.showErrors = function (opts) {
        //noinspection JSCheckFunctionSignatures
        SvarohJsFormValidator.each(this, function (item) {
            item.jsFormValidator.errors[opts['sourceId']] = opts['errors'];
            item.jsFormValidator.showErrors.apply(item, [opts['errors'], opts['sourceId']]);
            SvarohJsFormValidator.syncNativeValidity(item.jsFormValidator, opts['sourceId']);
        });
    };

    this.submitForm = function (event) {
        //noinspection JSCheckFunctionSignatures
        SvarohJsFormValidator.each(this, function (item) {
            var element = item.jsFormValidator;

            if (event && element.domNode && element.domNode.__svarohJsFormValidatorSubmitting) {
                delete element.domNode.__svarohJsFormValidatorSubmitting;
                return;
            }

            // The configuration may have been rendered after the models, in
            // which case initModel() could not read the flag yet
            if (element.domNode) {
                SvarohJsFormValidator.disableNativeValidationUi(element.domNode);
            }

            element.validateRecursively();
            SvarohJsFormValidator.validateNativeLeftovers(element);
            var hasAjaxQueue = SvarohJsFormValidator.ajax.queue > 0;
            var submitCallback = function () {
                element.onValidate.apply(element.domNode, [SvarohJsFormValidator.getAllErrors(element, {}), event]);
                if (!element.isValid()) {
                    if (event) {
                        event.preventDefault();
                    }

                    return;
                }

                if (!event) {
                    element.submitForm.apply(item, [item]);
                } else if (hasAjaxQueue) {
                    if (element.domNode && typeof element.domNode.requestSubmit === 'function') {
                        element.domNode.__svarohJsFormValidatorSubmitting = true;
                        if (event.submitter) {
                            element.domNode.requestSubmit(event.submitter);
                        } else {
                            element.domNode.requestSubmit();
                        }
                    } else {
                        element.submitForm.apply(item, [item]);
                    }
                }
            };

            if (hasAjaxQueue) {
                if (event) {
                    event.preventDefault();
                }
                SvarohJsFormValidator.ajax.callbacks.push(submitCallback);
            } else {
                submitCallback();
            }
        });
    };

    this.get = function () {
        var elements = [];
        //noinspection JSCheckFunctionSignatures
        SvarohJsFormValidator.each(this, function (item) {
            elements.push(item.jsFormValidator);
        });

        return elements;
    };

    //noinspection JSUnusedGlobalSymbols
    this.addPrototype = function(name) {
        //noinspection JSCheckFunctionSignatures
        SvarohJsFormValidator.each(this, function (item) {
            var prototype = SvarohJsFormValidator.preparePrototype(
                SvarohJsFormValidator.cloneObject(item.jsFormValidator.prototype),
                name
            );
            item.jsFormValidator.children[name] = SvarohJsFormValidator.createElement(prototype);
            item.jsFormValidator.children[name].parent = item.jsFormValidator;
        });
    };

    //noinspection JSUnusedGlobalSymbols
    this.delPrototype = function(name) {
        //noinspection JSCheckFunctionSignatures
        SvarohJsFormValidator.each(this, function (item) {
            delete (item.jsFormValidator.children[name]);
        });
    };
}

var SvarohJsBaseConstraint = {
    prepareMessage: function (message, params, plural) {
        var realMsg = message;
        var listMsg = message.split('|');
        if (listMsg.length > 1) {
            if (plural == 1) {
                realMsg = listMsg[0];
            } else {
                realMsg = listMsg[1];
            }
        }

        for (var paramName in params) {
            var regex = new RegExp(paramName, 'g');
            realMsg = realMsg.replace(regex, params[paramName]);
        }

        return realMsg;
    },

    /**
     * Returns the value a comparison constraint has to compare against: either
     * the "value" option or, when the "propertyPath" option is used instead, the
     * current value of the field that property of the validated object is bound
     * to. A path pointing outside of the form gives undefined, which tells the
     * constraint to stay silent and leave the answer to the server.
     *
     * @param {Object} constraint
     * @param {SvarohJsFormElement} scope
     *
     * @return {*}
     */
    getComparedValue: function (constraint, scope) {
        if (!constraint.propertyPath) {
            return constraint.value;
        }

        return SvarohJsFormValidator.getPropertyPathValue(scope, constraint.propertyPath);
    },

    formatValue: function (value) {
        switch (Object.prototype.toString.call(value)) {
            case '[object Date]':
                return value.format('Y-m-d H:i:s');

            case '[object Object]':
                return 'object';

            case '[object Array]':
                return 'array';

            case '[object String]':
                return '"' + value + '"';

            case '[object Null]':
                return 'null';

            case '[object Boolean]':
                return value ? 'true' : 'false';

            default:
                return String(value);
        }
    }
};

var SvarohJsFormValidator = new function () {
    this.forms = {};
    this.errorClass = 'form-errors';
    this.config = {};
    this.ajax = new SvarohJsAjaxRequest();
    this.customizeMethods = new SvarohJsCustomizeMethods();
    this.constraintsCounter = 0;

    //noinspection JSUnusedGlobalSymbols
    this.addModel = function (model, onLoad) {
        var self = this;
        if (!model) return;
        var register = function () {
            var element = self.initModel(model);
            // A model of a form that is not rendered on the current page has no
            // element at all, keep it out of the registry instead of storing a
            // null that every consumer of "forms" would have to guard against
            if (element) {
                self.forms[model.id] = element;
            }

            return element;
        };

        if (onLoad !== false) {
            this.onDocumentReady(register);
        } else {
            var element = register();
            // A model rendered inline runs before js_validator_config() when
            // the template puts the configuration further down the document,
            // and the native UI has to be off before the first submit
            this.onDocumentReady(function () {
                if (element && element.domNode) {
                    self.disableNativeValidationUi(element.domNode);
                }
            });
        }
    };

    this.onDocumentReady = function (callback) {
        var addListener = document.addEventListener || document.attachEvent;
        var removeListener = document.removeEventListener || document.detachEvent;
        var eventName = document.addEventListener ? "DOMContentLoaded" : "onreadystatechange";

        addListener.call(document, eventName, function (callee) {
            removeListener.call(this, eventName, callee, false);
            callback();
        }, false)
    };

    /**
     * @param {Object} model
     *
     * @return {SvarohJsFormElement|null}
     */
    this.initModel = function (model) {
        var element = this.createElement(model);
        // "createElement" returns null for a model without any DOM node, the
        // same way it skips such children, there is nothing to initialize then
        if (!element) {
            return null;
        }

        var form = this.findFormElement(element);
        element.domNode = form;
        this.attachElement(element);
        if (form) {
            this.disableNativeValidationUi(form);
            this.attachDefaultEvent(element, form);
        }

        return element;
    };

    /**
     * The HTML5 integration is opt-in: the bundle exports the flag with the
     * rest of its configuration and the browser only acts on it when the
     * application turned it on
     *
     * @return {boolean}
     */
    this.isHtml5Enabled = function () {
        return true === (this.config && this.config.html5Validation);
    };

    /**
     * A browser validates a form interactively before it fires "submit", so a
     * field it refuses on its own - "required", "type=email", "min", "step" -
     * stops the event this library listens to and shows a native bubble
     * instead of the error list. The "novalidate" attribute turns that step
     * off and leaves the reporting to this library, which surfaces the same
     * failures itself through validateNative().
     *
     * @param {HTMLFormElement} form
     */
    this.disableNativeValidationUi = function (form) {
        if (this.isHtml5Enabled() && form.tagName && 'form' === form.tagName.toLowerCase()) {
            form.setAttribute('novalidate', 'novalidate');
        }
    };

    /**
     * Reads what the browser knows about the element on its own: a "number"
     * field the user filled with letters, an empty "required" field, a value
     * outside the "min", "max" or "step" the widget carries. The message this
     * library wrote is removed first, otherwise the browser would answer with
     * it instead of its own diagnosis.
     *
     * @param {SvarohJsFormElement} element
     *
     * @return {Array}
     */
    this.validateNative = function (element) {
        var domNode = element.domNode;
        if (!this.isHtml5Enabled() || !domNode || typeof domNode.setCustomValidity !== 'function') {
            return [];
        }

        domNode.setCustomValidity('');
        if (!domNode.willValidate || !domNode.validity || domNode.validity.valid) {
            return [];
        }

        // An expanded choice renders one widget per choice and every one of
        // them carries the same "required", so the browser reports the same
        // missing value once per radio. The group is spoken for by its first
        // widget, which is where the error list of the group belongs.
        if (this.isSecondaryRadioOfItsGroup(domNode)) {
            return [];
        }

        var error = new SvarohJsFormError(domNode.validationMessage || 'This value is not valid.');
        // "required" and NotBlank are the same failure, and the constraint
        // owns it; every other diagnosis of the browser is its own
        error.describesTheSameFailureAsNotBlank = true === domNode.validity.valueMissing
            && !domNode.validity.badInput
            && !domNode.validity.typeMismatch
            && !domNode.validity.patternMismatch
            && !domNode.validity.tooLong
            && !domNode.validity.tooShort
            && !domNode.validity.rangeUnderflow
            && !domNode.validity.rangeOverflow
            && !domNode.validity.stepMismatch;

        return [error];
    };

    /**
     * All the radios of a group share a name and a "required" attribute, so
     * the browser refuses every one of them for the one missing value
     *
     * @param {HTMLElement} domNode
     *
     * @return {boolean}
     */
    this.isSecondaryRadioOfItsGroup = function (domNode) {
        if ('radio' !== domNode.type || !domNode.form || !domNode.name) {
            return false;
        }

        var group = domNode.form.elements[domNode.name];

        return !!(group && group.length && group[0] !== domNode);
    };

    /**
     * Every widget of a form used to be enforced by the browser, including
     * the ones this library has no model for - a field excluded server side
     * with "js_validation" => false, a widget switched off with
     * customize(node, {disabled: true}), a control a form theme rendered
     * outside of the model. Setting "novalidate" takes that enforcement away
     * from all of them at once, so what the browser still refuses and nobody
     * reported is collected here and reported through the error list, and the
     * submit is refused for it the way the browser used to refuse it.
     *
     * @param {SvarohJsFormElement} element the element of the form itself
     */
    this.validateNativeLeftovers = function (element) {
        var form = element.domNode;
        if (!this.isHtml5Enabled() || !form || !form.elements) {
            return;
        }

        var sourceId = 'form-error-' + String(element.id).replace(/_/g, '-');
        for (var index = 0; index < form.elements.length; index++) {
            var domNode = form.elements[index];
            if (!domNode.willValidate || !domNode.validity || domNode.validity.valid) {
                continue;
            }

            // A message mirrored onto the widget is this library refusing it,
            // and an element with a model of its own was already asked during
            // validate() - unless its validation is switched off, which never
            // meant the browser should stop enforcing the widget either
            var owner = domNode.jsFormValidator;
            if (domNode.validity.customError || (owner && !owner.disabled)) {
                continue;
            }

            if (this.isSecondaryRadioOfItsGroup(domNode)) {
                continue;
            }

            var target = owner || element;
            if (!target.errors[sourceId]) {
                target.errors[sourceId] = [];
            }

            target.errors[sourceId].push(domNode.validationMessage || 'This value is not valid.');
            var errorPath = this.getErrorPathElement(target);
            var errorDomNode = this.findErrorDomNode(errorPath);
            if (errorDomNode) {
                errorPath.showErrors.apply(errorDomNode, [target.errors[sourceId], sourceId]);
            }
        }
    };

    /**
     * Mirrors the errors of the element into the Constraint Validation API, so
     * that ":invalid" styling, "form.checkValidity()" and any other native
     * tooling agree with what this library decided. The state is as fresh as
     * the last validation run of the element, which this bundle performs on
     * submit and on the events the application asks for.
     *
     * @param {SvarohJsFormElement} element
     * @param {String}                [preferredSourceId] the source being rendered
     */
    this.syncNativeValidity = function (element, preferredSourceId) {
        var domNode = element.domNode;
        if (!this.isHtml5Enabled() || !domNode || typeof domNode.setCustomValidity !== 'function') {
            return;
        }

        var message = '';
        // The source that is being rendered speaks first, so that the message
        // the browser reports is the one heading the list the user reads
        if (preferredSourceId && element.errors[preferredSourceId] && element.errors[preferredSourceId].length) {
            message = String(element.errors[preferredSourceId][0]);
        } else {
            for (var sourceId in element.errors) {
                if (element.errors[sourceId].length) {
                    message = String(element.errors[sourceId][0]);
                    break;
                }
            }
        }

        domNode.setCustomValidity(message);
    };

    /**
     * @param {Object} model
     *
     * @return {SvarohJsFormElement|null}
     */
    this.createElement = function (model) {
        var element = new SvarohJsFormElement();
        element.domNode = this.findDomElement(model);
        if (model.children instanceof Array && !model.length && !element.domNode) {
            return null;
        }

        for (var key in model) {
            if ('children' == key) {
                for (var childName in model.children) {
                    var childElement = this.createElement(model.children[childName]);
                    if (childElement) {
                        element.children[childName] = childElement;
                        element.children[childName].parent = element;
                    }
                }
            } else if ('transformers' == key) {
                element.transformers = this.parseTransformers(model[key]);
            } else {
                element[key] = model[key];
            }
        }

        // Parse constraints
        for (var type in element.data) {
            var constraints = [];
            if (element.data[type].constraints) {
                constraints = this.parseConstraints(element.data[type].constraints);
            }
            element.data[type].constraints = constraints;

            var getters = {};
            if (element.data[type].getters) {
                for (var getterName in element.data[type].getters) {
                    getters[getterName] = this.parseConstraints(element.data[type].getters[getterName]);
                }
            }
            element.data[type].getters = getters;
        }

        this.attachElement(element);

        return element;
    };

    /**
     * @param {SvarohJsFormElement} element
     */
    this.validateElement = function (element) {
        var errors = [];
        var value;

        try {
            value = this.getElementValue(element);
        } catch (error) {
            // Symfony reports a value it cannot reverse transform with the
            // "invalid_message" of the element and skips its constraints
            return [new SvarohJsFormError(this.getTransformationFailureMessage(element, error))];
        }

        for (var type in element.data) {
            if ('entity' == type && element.parent && !this.shouldValidEmbedded(element)) {
                continue;
            }

            if ('parent' == type && element.parent && element.parent.parent && !this.shouldValidEmbedded(element.parent)) {
                continue;
            }

            // Evaluate groups
            var groupsValue = element.data[type]['groups'];
            if (typeof groupsValue == "string") {
                groupsValue = this.getParentElementById(groupsValue, element).groups.apply(element.domNode);
            }
            var scope = this.getValidatedObjectElement(element, type);
            errors = errors.concat(this.validateConstraints(
                value,
                element.data[type]['constraints'],
                groupsValue,
                element,
                scope
            ));

            for (var getterName in element.data[type]['getters']) {
                if (typeof element.callbacks[getterName] == "function") {
                    var receivedValue = element.callbacks[getterName].apply(element.domNode);
                    errors = errors.concat(this.validateConstraints(
                        receivedValue,
                        element.data[type]['getters'][getterName],
                        groupsValue,
                        element,
                        scope
                    ));
                }
            }
        }
        return errors;
    };

    /**
     * @param {SvarohJsFormElement} element
     * @param {Error} error
     *
     * @return {String}
     */
    this.getTransformationFailureMessage = function (element, error) {
        var message = element.invalidMessage || (error && error.message) || 'This value is not valid.';

        return String(message).replace(
            '{{ value }}',
            SvarohJsBaseConstraint.formatValue(this.getInputValue(element))
        );
    };

    this.shouldValidEmbedded = function (element) {
        if (this.getElementValidConstraint(element)) {
            return true;
        } else if (
            element.parent
            && 'Symfony\\Component\\Form\\Extension\\Core\\Type\\CollectionType' == element.parent.type
        ) {
            var validConstraint = this.getElementValidConstraint(element);

            return !validConstraint || validConstraint.traverse;
        }

        return false;
    };

    this.getElementValidConstraint = function (element) {
        if (element.data && element.data.form) {
            for (var i in element.data.form.constraints) {
                if (element.data.form.constraints[i] instanceof SymfonyComponentValidatorConstraintsValid) {
                    return element.data.form.constraints[i];
                }
            }
        }
    };

    /**
     * Returns the element that stands for the object Symfony validates, the one
     * a constraint resolves its "propertyPath" option against. Constraints
     * declared on the class of the element ("entity") belong to the data of the
     * element itself, the ones coming from the class of the parent ("parent") or
     * from the form definition ("form") belong to the data of the parent form.
     *
     * @param {SvarohJsFormElement} element
     * @param {String} type
     *
     * @return {SvarohJsFormElement}
     */
    this.getValidatedObjectElement = function (element, type) {
        if ('entity' === type) {
            return element;
        }

        return element.parent || element;
    };

    /**
     * Finds the element holding the value a Symfony property path points to.
     * Only paths made of property names are supported: each of their segments is
     * looked up among the children of the given element, the way Symfony maps
     * the fields of a form onto the properties of its data.
     *
     * @param {SvarohJsFormElement} scope
     * @param {String} propertyPath
     *
     * @return {SvarohJsFormElement|null}
     */
    this.findElementByPropertyPath = function (scope, propertyPath) {
        if (!scope || !propertyPath) {
            return null;
        }

        var path = String(propertyPath).replace(/\[([^\]]*)\]/g, '.$1').split('.');
        var element = scope;

        for (var index = 0; index < path.length; index++) {
            var segment = path[index];
            if ('' === segment) {
                continue;
            }

            if (!element.children || !element.children[segment]) {
                return null;
            }

            element = element.children[segment];
        }

        return element === scope ? null : element;
    };

    /**
     * Returns the current value of the element a "propertyPath" option points
     * to, or undefined when the path matches no field of the form
     *
     * @param {SvarohJsFormElement} scope
     * @param {String} propertyPath
     *
     * @return {*}
     */
    this.getPropertyPathValue = function (scope, propertyPath) {
        var element = this.findElementByPropertyPath(scope, propertyPath);
        if (!element) {
            return undefined;
        }

        try {
            return this.getElementValue(element);
        } catch (error) {
            // A value the referenced field cannot reverse transform is reported
            // on that field, it does not make the current one invalid
            return undefined;
        }
    };

    /**
     * @param value
     * @param {Array} constraints
     * @param {Array} groups
     * @param {SvarohJsFormElement} owner
     * @param {SvarohJsFormElement} scope
     *
     * @return {Array}
     */
    this.validateConstraints = function (value, constraints, groups, owner, scope) {
        var errors = [];
        var i = constraints.length;
        while (i--) {
            if (this.checkValidationGroups(groups, constraints[i])) {
                errors = errors.concat(constraints[i].validate(value, owner, scope));
            }
        }

        for (var index = 0; index < errors.length; index++) {
            if (typeof errors[index] === 'string') {
                errors[index] = new SvarohJsFormError(errors[index]);
            }
        }

        return errors;
    };

    /**
     * @param {Array} needle
     * @param {Array} haystack
     * @return {boolean}
     */
    this.checkValidationGroups = function (needle, constraint) {
        var result = false;
        var i = needle.length;
        // For symfony 2.6 Api
        var haystack = constraint.groups || ['Default'];
        while (i--) {
            if (-1 !== haystack.indexOf(needle[i])) {
                result = true;
                break;
            }
        }

        return result;
    };

    /**
     * @param {SvarohJsFormElement} element
     */
    this.getElementValue = function (element) {
        var i = element.transformers.length;
        var value = this.getInputValue(element);

        if (i && undefined === value) {
            value = this.getMappedValue(element);
        } else if ('Symfony\\Component\\Form\\Extension\\Core\\Type\\CollectionType' == element.type) {
            value = {};
            for (var childName in element.children) {
                value[childName] = this.getMappedValue(element.children[childName]);
            }
        } else {
            value = this.getSpecifiedElementTypeValue(element);
        }

        while (i--) {
            value = element.transformers[i].reverseTransform(value, element);
        }

        return value;
    };

    this.getInputValue = function (element) {
        if (!element.domNode) {
            return undefined;
        }

        return false === element.trim ? element.domNode.value : this.trimValue(element.domNode.value);
    };

    /**
     * Symfony trims the submitted value before any transformer sees it, unless
     * the element is configured with "trim" set to false. The character class
     * is the one of Symfony\Component\Form\Util\StringUtil: the Unicode
     * separators, controls and format characters.
     *
     * @param {*} value
     *
     * @return {*}
     */
    this.trimValue = function (value) {
        if (typeof value !== 'string') {
            return value;
        }

        return value.replace(TRIMMED_EDGES, '');
    };

    this.getMappedValue = function (element) {
        var result = this.getSpecifiedElementTypeValue(element);

        if (undefined === result) {
            result = {};
            for (var childName in element.children) {
                var child = element.children[childName];
                result[child.name] = this.getMappedValue(child);
            }
        }

        return result;
    };

    this.getSpecifiedElementTypeValue = function (element) {
        if (!element.domNode) {
            return undefined;
        }

        var value;
        if (
            'Symfony\\Component\\Form\\Extension\\Core\\Type\\CheckboxType' == element.type
            || 'Symfony\\Component\\Form\\Extension\\Core\\Type\\RadioType' == element.type
        ) {
            value = element.domNode.checked;
        } else if ('select' === element.domNode.tagName.toLowerCase()) {
            value = [];
            var field = element.domNode;
            var len = field.length;
            while (len--) {
                if (field.options[len].selected) {
                    value.push(field.options[len].value);
                }
            }
        } else {
            value = this.getInputValue(element);
        }

        return value;
    };

    /**
     * @param {Object} list
     */
    this.parseConstraints = function (list) {
        var constraints = [];
        for (var name in list) {
            var className = name.replace(/\\/g, '');
            if (undefined !== window[className]) {
                var i = list[name].length;
                while (i--) {
                    var constraint = new window[className]();
                    for (var param in list[name][i]) {
                        constraint[param] = list[name][i][param];
                    }
                    constraint.uniqueId = this.constraintsCounter;
                    this.constraintsCounter++;
                    if (typeof constraint.onCreate === 'function') {
                        constraint.onCreate();
                    }
                    constraints.push(constraint);
                }
            }
        }

        return constraints;
    };

    /**
     * @param list
     * @returns {Array}
     */
    this.parseTransformers = function (list) {
        var transformers = [];
        var i = list.length;
        while (i--) {
            var className = String(list[i]['name']).replace(/\\/g, '');
            if (undefined !== window[className]) {
                var transformer = new window[className]();
                for (var propName in list[i]) {
                    transformer[propName] = list[i][propName];
                }
                if (undefined !== transformer.transformers) {
                    transformer.transformers = this.parseTransformers(transformer.transformers);
                }
                transformers.push(transformer);
            }
        }

        return transformers;
    };

    /**
     * @param {String} id
     * @param {SvarohJsFormElement} element
     */
    this.getParentElementById = function (id, element) {
        if (id == element.id) {
            return element;
        } else if (element.parent) {
            return this.getParentElementById(id, element.parent);
        } else {
            return null;
        }
    };

    /**
     * @param {SvarohJsFormElement} element
     */
    this.attachElement = function (element) {
        if (!element.domNode) {
            return;
        }

        if (undefined !== element.domNode.jsFormValidator) {
            for (var key in element.domNode.jsFormValidator) {
                element[key] = element.domNode.jsFormValidator[key];
            }
        }

        element.domNode.jsFormValidator = element;
    };

    /**
     * @param {SvarohJsFormElement} element
     * @param {HTMLFormElement} form
     */
    this.attachDefaultEvent = function (element, form) {
        form.addEventListener('submit', function (event) {
            SvarohJsFormValidator.customize(form, 'submitForm', event);
        });
    };

    /**
     * @param {Object} model
     *
     * @return {HTMLElement|null}
     */
    this.findDomElement = function (model) {
        var domElement = document.getElementById(model.id);
        if (!domElement) {
            var list = document.getElementsByName(model.name);
            if (list.length) {
                domElement = list[0];
            }
        }

        return domElement;
    };

    /**
     * @param {SvarohJsFormElement} element
     *
     * @return {HTMLFormElement|null}
     */
    this.findFormElement = function (element) {
        var form = null;
        if (element.domNode && 'form' == element.domNode.tagName.toLowerCase()) {
            form = element.domNode;
        } else {
            var realChild = this.findRealChildElement(element);
            if (realChild) {
                form = this.findParentForm(realChild);
            }
        }

        return form;
    };

    /**
     * Find a rendered DOM node that represents the given element
     *
     * When the element itself is not rendered, its descendants are used
     * instead. All the descendants that are rendered have to belong to the
     * same form, otherwise the element is treated as not rendered at all, so
     * that a single id or name collision cannot attach a whole model to a
     * foreign form
     *
     * @param {SvarohJsFormElement} element
     *
     * @return {HTMLElement|null}
     */
    this.findRealChildElement = function (element) {
        if (element.domNode) {
            return element.domNode;
        }

        var child = null;
        var form = null;
        for (var childName in element.children) {
            var childNode = this.findRealChildElement(element.children[childName]);
            if (!childNode) {
                continue;
            }

            var childForm = this.findParentForm(childNode);
            if (!child) {
                child = childNode;
                form = childForm;
            } else if (childForm !== form) {
                return null;
            }
        }

        return child;
    };

    /**
     * @param {HTMLElement|Node} child
     *
     * @return {HTMLElement|null}
     */
    this.findParentForm = function (child) {
        if (child.tagName && 'form' == child.tagName.toLowerCase()) {
            return child;
        } else if (child.parentNode) {
            return this.findParentForm(child.parentNode);
        } else {
            return null;
        }
    };

    /**
     * @param {HTMLElement} htmlElement
     * @returns {Node}
     */
    this.getDefaultErrorContainerNode = function (htmlElement) {
        var ul = htmlElement.previousSibling;
        if (!ul || ul.className !== this.errorClass) {
            return null;
        } else {
            return ul;
        }
    };

    /**
     * Get related element to show error list
     *
     * Bubbling errors are moved up one level at a time, the same way Symfony
     * does it, so they stop on the closest non-bubbling ancestor instead of
     * always landing on the form root.
     *
     * @param {SvarohJsFormElement} element
     */
    this.getErrorPathElement = function (element) {
        if (element.bubbling && element.parent) {
            return this.getErrorPathElement(element.parent);
        } else {
            return element;
        }
    };

    /**
     * Find recursively for the root (from) element
     * @param {SvarohJsFormElement} element
     */
    this.getRootElement = function (element) {
        if (element.parent) {
            return this.getRootElement(element.parent);
        } else {
            return element;
        }
    };

    this.findErrorDomNode = function (element) {
        if (element.domNode) {
            return element.domNode;
        }

        for (var childName in element.children) {
            var childDomNode = this.findErrorDomNode(element.children[childName]);
            if (childDomNode) {
                return childDomNode;
            }
        }

        return null;
    };

    /**
     * Applies customizing for the specified elements
     *
     * @param items
     * @param method
     * @returns {*}
     */
    this.customize = function (items, method) {
        if (!Array.isArray(items)) {
            items = [items];
        }

        if (!method) {
            return this.customizeMethods.get.apply(items, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object') {
            return this.customizeMethods.init.apply(items, Array.prototype.slice.call(arguments, 1));
        } else if (this.customizeMethods[method]) {
            return this.customizeMethods[method].apply(items, Array.prototype.slice.call(arguments, 2));
        } else {
            $.error('Method ' + method + ' does not exist');
            return this;
        }
    };

    /**
     * Loop an array of elements
     *
     * @param list
     * @param callback
     * @param skipEmpty
     */
    this.each = function (list, callback, skipEmpty) {
        skipEmpty = (undefined == skipEmpty) ? true : skipEmpty;
        var len = list.length;
        while (len--) {
            if (skipEmpty && (!list[len] || !list[len].jsFormValidator)) {
                continue;
            }
            callback(list[len]);
        }
    };

    /**
     * Looks for the callback in a specified element by string or array
     *
     * @param {SvarohJsFormElement} element
     * @param {Array|String} data
     * @returns {Function|null}
     */
    this.getRealCallback = function (element, data) {
        var className = null;
        var methodName = null;
        if (typeof data == "string") {
            methodName = data;
        } else if (Array.isArray(data)) {
            if (1 == data.length) {
                methodName = data[0];
            } else {
                className = data[0];
                methodName = data[1];
            }
        }

        var callback = null;

        if (!element.callbacks[className] && typeof element.callbacks[methodName] == "function") {
            callback = element.callbacks[methodName];
        } else if (element.callbacks[className] && typeof element.callbacks[className][methodName] == "function") {
            callback = element.callbacks[className][methodName];
        } else if (typeof element.callbacks[methodName] == "function") {
            callback = element.callbacks[methodName];
        }

        return callback;
    };

    /**
     * Returns an object with all the element's and children's errors
     *
     * @param {SvarohJsFormElement} element
     * @param {Object} container
     *
     * @returns {Object}
     */
    this.getAllErrors = function (element, container) {
        if (container == null || typeof container !== 'object') {
            container = {};
        }

        var hasErrors = false;
        for (var sourceId in element.errors) {
            if (element.errors[sourceId].length) {
                hasErrors = true;
                break;
            }
        }

        if (hasErrors) {
            container[element.id] = element.errors;
        }

        for (var childName in element.children) {
            container = this.getAllErrors(element.children[childName], container);
        }

        return container;
    };

    /**
     * Replace patterns with real values for the specified prototype
     *
     * @param {Object} prototype
     * @param {String} name
     * @param {String} id
     */
    this.preparePrototype = function (prototype, name, id) {
        id = typeof id === 'undefined' ? name : id;

        prototype.name = prototype.name.replace(/__name__/g, name);
        prototype.id = prototype.id.replace(/__name__/g, id);

        if (typeof prototype.children == 'object') {
            for (var childName in prototype.children) {
                prototype[childName] = this.preparePrototype(prototype.children[childName], name, id);
            }
        }

        return prototype;
    };

    /**
     * Clone object recursively
     *
     * @param {{}} object
     * @returns {{}}
     */
    this.cloneObject = function (object) {
        var clone = {};
        for (var i in object) {
            if (typeof object[i] == 'object' && !(object[i] instanceof Array)) {
                clone[i] = this.cloneObject(object[i]);
            } else {
                clone[i] = object[i];
            }
        }

        return clone;
    };

    /**
     * Check if a mixed value is emty
     *
     * @param value
     *
     * @returns boolean
     */
    this.isValueEmty = function (value) {
        return [undefined, null, false].indexOf(value) >= 0 || 0 === this.getValueLength(value);
    };

    /**
     * Check if a value is array
     *
     * @param value
     *
     * @returns boolean
     */
    this.isValueArray = function (value) {
        return value instanceof Array;
    };

    /**
     * Check if a value is object
     *
     * @param value
     *
     * @returns boolean
     */
    this.isValueObject = function (value) {
        return typeof value == 'object' && null !== value;
    };

    /**
     * Returns length of a mixed value
     *
     * @param value
     *
     * @returns int|null
     */
    this.getValueLength = function (value) {
        var length = null;
        if (typeof value == 'number' || typeof value == 'string' || this.isValueArray(value)) {
            length = value.length;
        } else if (this.isValueObject(value)) {
            var count = 0;
            for (var propName in value) {
                if (value.hasOwnProperty(propName)) {
                    count++;
                }
            }
            length = count;
        }

        return length;
    };
}();

window.SvarohJsBaseConstraint = SvarohJsBaseConstraint;
window.SvarohJsFormError = SvarohJsFormError;
window.SvarohJsFormValidator = SvarohJsFormValidator;
window.SvarohJsFormElement = SvarohJsFormElement;
