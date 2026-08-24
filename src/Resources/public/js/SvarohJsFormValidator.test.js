import './SvarohJsFormValidator';

describe('SvarohJsFormValidator prototypes', () => {
    test('preparePrototype uses the prototype item name as the default id segment', () => {
        const prototype = {
            name: 'form[items][__name__]',
            id: 'form_items___name__',
            children: {
                title: {
                    name: 'form[items][__name__][title]',
                    id: 'form_items___name___title',
                    children: {},
                },
            },
        };

        const prepared = window.SvarohJsFormValidator.preparePrototype(prototype, '0');

        expect(prepared.name).toBe('form[items][0]');
        expect(prepared.id).toBe('form_items_0');
        expect(prepared.children.title.name).toBe('form[items][0][title]');
        expect(prepared.children.title.id).toBe('form_items_0_title');
    });

    test('addPrototype does not duplicate the parent id in generated child ids', () => {
        const parent = window.SvarohJsFormValidator.createElement({
            id: 'form_items',
            name: 'form[items]',
            type: '',
            invalidMessage: '',
            bubbling: false,
            disabled: false,
            transformers: [],
            data: {},
            children: {},
            prototype: {
                id: 'form_items___name__',
                name: 'form[items][__name__]',
                type: '',
                invalidMessage: '',
                bubbling: false,
                disabled: false,
                transformers: [],
                data: {},
                children: {},
            },
        });

        window.SvarohJsFormValidator.customizeMethods.addPrototype.apply([{ jsFormValidator: parent }], ['0']);

        expect(parent.children[0].id).toBe('form_items_0');
        expect(parent.children[0].name).toBe('form[items][0]');
        expect(parent.children[0].parent).toBe(parent);
    });
});

describe('SvarohJsFormValidator error mapping', () => {
    function createElement(id, name) {
        const element = new window.SvarohJsFormElement();
        element.id = id;
        element.name = name || id;
        element.domNode = document.createElement('input');
        element.showErrors = jest.fn();

        return element;
    }

    function addChild(parent, name, child) {
        parent.children[name] = child;
        child.parent = parent;

        return child;
    }

    function addConstraint(element, validate) {
        element.data.form = {
            constraints: [{
                groups: ['Default'],
                validate,
            }],
            getters: {},
            groups: ['Default'],
        };
    }

    test('keeps plain string errors on the validated element', () => {
        const element = createElement('user_email');
        addConstraint(element, () => ['Invalid email.']);

        expect(element.validate()).toBe(false);

        expect(element.errors['form-error-user-email']).toEqual(['Invalid email.']);
        expect(element.showErrors).toHaveBeenLastCalledWith(
            ['Invalid email.'],
            'form-error-user-email'
        );
    });

    test('routes structured errors to a direct child path', () => {
        const form = createElement('user');
        const email = addChild(form, 'email', createElement('user_email'));
        addConstraint(form, () => {
            const error = new window.SvarohJsFormError('Email is already used.');
            error.atPath = 'email';

            return [error];
        });

        expect(form.validate()).toBe(false);

        expect(form.errors['form-error-user']).toEqual([]);
        expect(email.errors['form-error-user']).toEqual(['Email is already used.']);
        expect(email.showErrors).toHaveBeenLastCalledWith(
            ['Email is already used.'],
            'form-error-user'
        );
    });

    test('routes structured errors to a nested child path', () => {
        const form = createElement('user');
        const address = addChild(form, 'address', createElement('user_address'));
        const street = addChild(address, 'street', createElement('user_address_street'));
        addConstraint(form, () => {
            const error = new window.SvarohJsFormError('Street is required.');
            error.atPath = 'address.street';

            return [error];
        });

        expect(form.validate()).toBe(false);

        expect(street.errors['form-error-user']).toEqual(['Street is required.']);
        expect(street.showErrors).toHaveBeenLastCalledWith(
            ['Street is required.'],
            'form-error-user'
        );
    });

    test('falls back to the validated element when a child path cannot be resolved', () => {
        const form = createElement('user');
        addConstraint(form, () => {
            const error = new window.SvarohJsFormError('Payment method is invalid.');
            error.atPath = 'payment';

            return [error];
        });

        expect(form.validate()).toBe(false);

        expect(form.errors['form-error-user']).toEqual(['Payment method is invalid.']);
        expect(form.showErrors).toHaveBeenLastCalledWith(
            ['Payment method is invalid.'],
            'form-error-user'
        );
    });

    test('clears previous routed errors before revalidating', () => {
        const form = createElement('user');
        const email = addChild(form, 'email', createElement('user_email'));
        let shouldFail = true;
        addConstraint(form, () => {
            if (!shouldFail) {
                return [];
            }

            const error = new window.SvarohJsFormError('Email is already used.');
            error.atPath = 'email';

            return [error];
        });

        expect(form.validate()).toBe(false);

        shouldFail = false;
        expect(form.validate()).toBe(true);

        expect(email.errors['form-error-user']).toEqual([]);
        expect(email.showErrors).toHaveBeenLastCalledWith([], 'form-error-user');
    });

    test('stores errors for model-only elements without requiring a DOM node', () => {
        const element = createElement('model_only');
        element.domNode = null;
        addConstraint(element, () => ['Model error.']);

        expect(element.validate()).toBe(false);

        expect(element.errors['form-error-model-only']).toEqual(['Model error.']);
        expect(element.showErrors).not.toHaveBeenCalled();
    });
});

describe('SvarohJsFormValidator recursive validation', () => {
    function createElement(id, name) {
        const element = new window.SvarohJsFormElement();
        element.id = id;
        element.name = name || id;
        element.domNode = document.createElement('input');
        element.showErrors = jest.fn();

        return element;
    }

    function addChild(parent, name, child) {
        parent.children[name] = child;
        child.parent = parent;

        return child;
    }

    function addConstraint(element, validate) {
        element.data.form = {
            constraints: [{
                groups: ['Default'],
                validate,
            }],
            getters: {},
            groups: ['Default'],
        };

        return element;
    }

    test('returns true when the element and all its children are valid', () => {
        const form = createElement('user');
        const email = addChild(form, 'email', createElement('user_email'));
        addChild(email, 'first', createElement('user_email_first'));
        addConstraint(form, () => []);
        addConstraint(email, () => []);

        expect(form.validateRecursively()).toBe(true);
    });

    test('returns false when a nested child is invalid', () => {
        const form = createElement('user');
        const address = addChild(form, 'address', createElement('user_address'));
        const street = addChild(address, 'street', createElement('user_address_street'));
        addConstraint(street, () => ['Street is required.']);

        expect(form.validateRecursively()).toBe(false);
        expect(street.errors['form-error-user-address-street']).toEqual(['Street is required.']);
    });

    test('returns false when the element itself is invalid but its children are valid', () => {
        const form = createElement('user');
        const email = addChild(form, 'email', createElement('user_email'));
        addConstraint(form, () => ['Form is invalid.']);
        addConstraint(email, () => []);

        expect(form.validateRecursively()).toBe(false);
    });

    test('validates every child even after an earlier sibling has failed', () => {
        const form = createElement('user');
        const email = addChild(form, 'email', createElement('user_email'));
        const street = addChild(form, 'street', createElement('user_street'));
        const zip = addChild(street, 'zip', createElement('user_street_zip'));
        const emailValidate = jest.fn(() => ['Email is invalid.']);
        const streetValidate = jest.fn(() => ['Street is required.']);
        const zipValidate = jest.fn(() => ['Zip is required.']);
        addConstraint(email, emailValidate);
        addConstraint(street, streetValidate);
        addConstraint(zip, zipValidate);

        expect(form.validateRecursively()).toBe(false);

        expect(emailValidate).toHaveBeenCalled();
        expect(streetValidate).toHaveBeenCalled();
        expect(zipValidate).toHaveBeenCalled();
        expect(street.showErrors).toHaveBeenLastCalledWith(
            ['Street is required.'],
            'form-error-user-street'
        );
        expect(zip.showErrors).toHaveBeenLastCalledWith(
            ['Zip is required.'],
            'form-error-user-street-zip'
        );
    });

    test('reports the recursive result through the public validate method', () => {
        const form = createElement('user');
        const email = addChild(form, 'email', createElement('user_email'));
        addConstraint(email, () => ['Email is invalid.']);
        form.domNode.jsFormValidator = form;

        expect(window.SvarohJsFormValidator.customize(
            form.domNode,
            'validate',
            { recursive: true, findUniqueConstraint: false }
        )).toBe(false);

        addConstraint(email, () => []);

        expect(window.SvarohJsFormValidator.customize(
            form.domNode,
            'validate',
            { recursive: true, findUniqueConstraint: false }
        )).toBe(true);
    });
});

describe('SvarohJsFormValidator submit flow', () => {
    afterEach(() => {
        window.SvarohJsFormValidator.ajax.queue = 0;
        window.SvarohJsFormValidator.ajax.callbacks = [];
    });

    const createElement = (valid, form) => ({
        domNode: form || {},
        errors: {},
        children: {},
        validateRecursively: jest.fn(),
        onValidate: jest.fn(),
        isValid: jest.fn(() => valid),
        submitForm: jest.fn(),
    });

    const submit = (element, event) => {
        window.SvarohJsFormValidator.customizeMethods.submitForm.apply(
            [{ jsFormValidator: element }],
            [event],
        );
    };

    test('lets a valid native submit event continue so the original submitter is preserved', () => {
        const event = { preventDefault: jest.fn() };
        const element = createElement(true);

        submit(element, event);

        expect(element.validateRecursively).toHaveBeenCalled();
        expect(element.onValidate).toHaveBeenCalledWith({}, event);
        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(element.submitForm).not.toHaveBeenCalled();
    });

    test('prevents a native submit event when validation fails', () => {
        const event = { preventDefault: jest.fn() };
        const element = createElement(false);

        submit(element, event);

        expect(element.onValidate).toHaveBeenCalledWith({}, event);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(element.submitForm).not.toHaveBeenCalled();
    });

    test('re-submits an async valid native event with the original submitter', () => {
        const submitter = {};
        const form = { requestSubmit: jest.fn() };
        const event = { preventDefault: jest.fn(), submitter };
        const element = createElement(true, form);
        window.SvarohJsFormValidator.ajax.queue = 1;

        submit(element, event);

        expect(event.preventDefault).toHaveBeenCalledTimes(1);
        expect(window.SvarohJsFormValidator.ajax.callbacks).toHaveLength(1);
        expect(form.requestSubmit).not.toHaveBeenCalled();

        window.SvarohJsFormValidator.ajax.queue = 0;
        window.SvarohJsFormValidator.ajax.callbacks[0]();

        expect(form.__svarohJsFormValidatorSubmitting).toBe(true);
        expect(form.requestSubmit).toHaveBeenCalledWith(submitter);
        expect(element.submitForm).not.toHaveBeenCalled();
    });

    test('allows a guarded re-submitted event to continue without validating again', () => {
        const form = { __svarohJsFormValidatorSubmitting: true };
        const event = { preventDefault: jest.fn() };
        const element = createElement(true, form);

        submit(element, event);

        expect(form.__svarohJsFormValidatorSubmitting).toBeUndefined();
        expect(element.validateRecursively).not.toHaveBeenCalled();
        expect(event.preventDefault).not.toHaveBeenCalled();
    });
});

// https://github.com/formapro/JsFormValidatorBundle/issues/75 - the browser
// validates the form on its own before the "submit" event this library listens
// to, so the two used to report the same form without knowing about each other
describe('SvarohJsFormValidator HTML5 integration', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        window.SvarohJsFormValidator.config = {};
        window.SvarohJsFormValidator.forms = {};
    });

    function enableHtml5() {
        window.SvarohJsFormValidator.config = { html5Validation: true };
    }

    /**
     * Renders a form with a single widget and returns the element of that
     * widget, initialized the way the rendered model would initialize it.
     *
     * @param {String} widget the markup of the input
     * @param {String} value  the submitted value
     *
     * @return {Object} the form and the field elements
     */
    function initForm(widget, value) {
        document.body.innerHTML = '<form name="profile" id="profile">' + widget + '</form>';
        if (undefined !== value) {
            document.getElementById('profile_field').value = value;
        }

        const form = window.SvarohJsFormValidator.initModel({
            id: 'profile',
            name: 'profile',
            type: '',
            invalidMessage: '',
            bubbling: false,
            disabled: false,
            transformers: [],
            data: {},
            children: {
                field: {
                    id: 'profile_field',
                    name: 'field',
                    type: '',
                    invalidMessage: '',
                    bubbling: false,
                    disabled: false,
                    transformers: [],
                    data: {},
                    children: {},
                },
            },
        });

        return { form, field: form.children.field };
    }

    function addConstraint(element, messages) {
        element.data.form = {
            constraints: [{
                groups: ['Default'],
                validate: () => messages(),
            }],
            getters: {},
            groups: ['Default'],
        };
    }

    test('marks the initialized form as novalidate so the error list is not replaced by a bubble', () => {
        enableHtml5();
        const { form } = initForm('<input id="profile_field" name="profile[field]" required>');

        expect(form.domNode.hasAttribute('novalidate')).toBe(true);
    });

    test('leaves the form alone while the integration is disabled', () => {
        const { form, field } = initForm('<input type="email" id="profile_field" name="profile[field]">', 'garbage');

        expect(form.domNode.hasAttribute('novalidate')).toBe(false);
        expect(field.validate()).toBe(true);
        expect(field.errors['form-error-profile-field']).toEqual([]);
        expect(field.domNode.validity.customError).toBe(false);
    });

    test('reports a value the browser refuses through the error list of the bundle', () => {
        enableHtml5();
        const { field } = initForm('<input type="email" id="profile_field" name="profile[field]">', 'garbage');

        expect(field.validate()).toBe(false);
        expect(field.errors['form-error-profile-field']).toEqual([field.domNode.validationMessage]);
        expect(field.domNode.previousSibling.className).toBe('form-errors');
        expect(field.domNode.previousSibling.textContent).not.toBe('');
    });

    test('reports an empty required field the browser would have blocked the submit for', () => {
        enableHtml5();
        const { field } = initForm('<input id="profile_field" name="profile[field]" required>');

        expect(field.validate()).toBe(false);
        expect(field.errors['form-error-profile-field']).toHaveLength(1);
    });

    test('keeps the message of the bundle when a constraint describes the same failure', () => {
        enableHtml5();
        const { field } = initForm('<input id="profile_field" name="profile[field]" required>');
        addConstraint(field, () => ['This value should not be blank.']);

        expect(field.validate()).toBe(false);
        expect(field.errors['form-error-profile-field']).toEqual(['This value should not be blank.']);
    });

    test('mirrors the errors of the bundle into the Constraint Validation API', () => {
        enableHtml5();
        const { form, field } = initForm('<input id="profile_field" name="profile[field]">', 'taken');
        let message = 'This value is already used.';
        addConstraint(field, () => (message ? [message] : []));

        expect(field.validate()).toBe(false);
        expect(field.domNode.validity.customError).toBe(true);
        expect(field.domNode.validationMessage).toBe('This value is already used.');
        expect(form.domNode.checkValidity()).toBe(false);

        message = '';
        expect(field.validate()).toBe(true);
        expect(field.domNode.validity.customError).toBe(false);
        expect(form.domNode.checkValidity()).toBe(true);
    });

    test('mirrors the errors another source pushed onto the element', () => {
        enableHtml5();
        const { field } = initForm('<input id="profile_field" name="profile[field]">', 'taken');

        window.SvarohJsFormValidator.customize(field.domNode, 'showErrors', {
            errors: ['This value is already used.'],
            sourceId: 'unique-entity-0',
        });

        expect(field.domNode.validationMessage).toBe('This value is already used.');

        field.clearErrors('unique-entity-0');

        expect(field.domNode.validity.customError).toBe(false);
    });

    test('reports a failure the browser diagnosed differently than the constraint did', () => {
        enableHtml5();
        const { field } = initForm('<input type="email" id="profile_field" name="profile[field]">', 'garbage');
        const nativeMessage = field.domNode.validationMessage;
        addConstraint(field, () => ['This value is too short.']);

        expect(field.validate()).toBe(false);
        expect(field.errors['form-error-profile-field']).toEqual([
            'This value is too short.',
            nativeMessage,
        ]);
    });

    test('reports an expanded choice once instead of once per radio', () => {
        enableHtml5();
        document.body.innerHTML =
            '<form name="profile" id="profile"><div id="profile_field">'
            + '<input type="radio" id="profile_field_0" name="profile[field]" value="a" required>'
            + '<input type="radio" id="profile_field_1" name="profile[field]" value="b" required>'
            + '</div></form>';

        const form = window.SvarohJsFormValidator.initModel({
            id: 'profile', name: 'profile', type: '', invalidMessage: '', bubbling: false,
            disabled: false, transformers: [], data: {}, children: {
                field: {
                    id: 'profile_field', name: 'field', type: '', invalidMessage: '',
                    bubbling: false, disabled: false, transformers: [], data: {}, children: {
                        0: {
                            id: 'profile_field_0', name: '0', type: '', invalidMessage: '',
                            bubbling: false, disabled: false, transformers: [], data: {}, children: {},
                        },
                        1: {
                            id: 'profile_field_1', name: '1', type: '', invalidMessage: '',
                            bubbling: false, disabled: false, transformers: [], data: {}, children: {},
                        },
                    },
                },
            },
        });

        form.validateRecursively();

        expect(form.isValid()).toBe(false);
        expect(form.children.field.children[0].errors['form-error-profile-field-0']).toHaveLength(1);
        expect(form.children.field.children[1].errors['form-error-profile-field-1']).toEqual([]);
        expect(document.querySelectorAll('ul.form-errors')).toHaveLength(1);
    });

    test('refuses the submit for a widget whose validation this bundle skips', () => {
        enableHtml5();
        const { form, field } = initForm(
            '<input type="email" id="profile_field" name="profile[field]" required>',
            'garbage'
        );
        window.SvarohJsFormValidator.customize(field.domNode, { disabled: true });

        const event = new window.Event('submit', { cancelable: true, bubbles: true });
        form.domNode.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
        expect(form.isValid()).toBe(false);
        expect(field.errors['form-error-profile']).toEqual([field.domNode.validationMessage]);
    });

    test('switches the native ui off when the configuration is rendered after the model', () => {
        const { form, field } = initForm(
            '<input type="email" id="profile_field" name="profile[field]">',
            'garbage'
        );

        expect(form.domNode.hasAttribute('novalidate')).toBe(false);

        enableHtml5();
        const event = new window.Event('submit', { cancelable: true, bubbles: true });
        form.domNode.dispatchEvent(event);

        expect(form.domNode.hasAttribute('novalidate')).toBe(true);
        expect(event.defaultPrevented).toBe(true);
        expect(field.errors['form-error-profile-field']).toEqual([field.domNode.validationMessage]);
    });

    test('mirrors the message of the source that is being rendered', () => {
        enableHtml5();
        const { field } = initForm('<input id="profile_field" name="profile[field]">', 'taken');
        window.SvarohJsFormValidator.customize(field.domNode, 'showErrors', {
            errors: ['This value is already used.'],
            sourceId: 'unique-entity-0',
        });
        addConstraint(field, () => ['This value should be blank.']);

        expect(field.validate()).toBe(false);
        expect(field.domNode.validationMessage).toBe('This value should be blank.');
    });

    test('drops the mirrored state of an element that never collected an error', () => {
        enableHtml5();
        const { field } = initForm('<input id="profile_field" name="profile[field]">', 'anything');
        field.domNode.setCustomValidity('A message left by a previous run.');
        field.errors = {};

        field.clearErrors();

        expect(field.domNode.validity.customError).toBe(false);
    });

    test('does not let a mirrored message hide the diagnosis of the browser', () => {
        enableHtml5();
        const { field } = initForm('<input type="email" id="profile_field" name="profile[field]">', 'garbage');
        const nativeMessage = field.domNode.validationMessage;

        field.domNode.setCustomValidity('A message left by a previous run.');

        expect(field.validate()).toBe(false);
        expect(field.errors['form-error-profile-field']).toEqual([nativeMessage]);
    });
});

describe('SvarohJsFormValidator runtime helpers', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        window.SvarohJsFormValidator.forms = {};
        window.SvarohJsFormValidator.constraintsCounter = 0;
        window.SvarohJsFormValidator.ajax.queue = 0;
        window.SvarohJsFormValidator.ajax.callbacks = [];
        delete window.AppConstraint;
        delete global.$;
    });

    test('formats constraint messages and values', () => {
        expect(window.SvarohJsBaseConstraint.prepareMessage(
            'One item|{{ count }} items',
            { '{{ count }}': 3 },
            3,
        )).toBe('3 items');
        expect(window.SvarohJsBaseConstraint.prepareMessage(
            'One item|{{ count }} items',
            { '{{ count }}': 1 },
            1,
        )).toBe('One item');

        const date = new Date(2026, 5, 5, 9, 4, 3);
        date.format = jest.fn(() => '2026-06-05 09:04:03');
        expect(window.SvarohJsBaseConstraint.formatValue(date)).toBe('2026-06-05 09:04:03');
        expect(date.format).toHaveBeenCalledWith('Y-m-d H:i:s');
        expect(window.SvarohJsBaseConstraint.formatValue({})).toBe('object');
        expect(window.SvarohJsBaseConstraint.formatValue([])).toBe('array');
        expect(window.SvarohJsBaseConstraint.formatValue('name')).toBe('"name"');
        expect(window.SvarohJsBaseConstraint.formatValue(null)).toBe('null');
        expect(window.SvarohJsBaseConstraint.formatValue(true)).toBe('true');
        expect(window.SvarohJsBaseConstraint.formatValue(15)).toBe('15');
    });

    test('creates elements with DOM nodes, constraints, getters, and transformers', () => {
        document.body.innerHTML = '<input id="email" name="profile[email]" value="yes">';
        window.AppConstraint = function () {
            this.onCreate = function () {
                this.created = true;
            };
            this.validate = function () {
                return [];
            };
        };

        const element = window.SvarohJsFormValidator.createElement({
            id: 'email',
            name: 'profile[email]',
            type: '',
            invalidMessage: '',
            bubbling: false,
            disabled: false,
            transformers: [{
                name: 'Symfony\\Component\\Form\\Extension\\Core\\DataTransformer\\BooleanToStringTransformer',
                trueValue: 'yes',
            }],
            data: {
                form: {
                    groups: ['Default'],
                    constraints: {
                        'App\\Constraint': [{ message: 'Invalid.' }],
                    },
                    getters: {
                        customValue: {
                            'App\\Constraint': [{ groups: ['Default'] }],
                        },
                    },
                },
            },
            children: {},
        });

        expect(element.domNode).toBe(document.getElementById('email'));
        expect(element.domNode.jsFormValidator).toBe(element);
        expect(element.data.form.constraints).toHaveLength(1);
        expect(element.data.form.constraints[0].message).toBe('Invalid.');
        expect(element.data.form.constraints[0].created).toBe(true);
        expect(element.data.form.constraints[0].uniqueId).toBe(0);
        expect(element.data.form.getters.customValue).toHaveLength(1);
        expect(element.transformers).toHaveLength(1);
        expect(window.SvarohJsFormValidator.getElementValue(element)).toBe(true);
    });

    test('validates constraints, callback getters, and dynamic validation groups', () => {
        const parent = new window.SvarohJsFormElement();
        parent.id = 'profile';
        parent.groups = jest.fn(() => ['Custom']);

        const element = new window.SvarohJsFormElement();
        element.id = 'profile_name';
        element.parent = parent;
        element.domNode = document.createElement('input');
        element.domNode.value = 'value';
        element.callbacks.customValue = jest.fn(() => 'callback-value');

        const fieldConstraint = {
            groups: ['Custom'],
            validate: jest.fn(() => ['Field error.']),
        };
        const getterConstraint = {
            groups: ['Custom'],
            validate: jest.fn(() => ['Getter error.']),
        };
        element.data = {
            form: {
                groups: 'profile',
                constraints: [fieldConstraint],
                getters: {
                    customValue: [getterConstraint],
                },
            },
        };

        const errors = window.SvarohJsFormValidator.validateElement(element);

        expect(parent.groups).toHaveBeenCalled();
        expect(fieldConstraint.validate).toHaveBeenCalledWith('value', element);
        expect(getterConstraint.validate).toHaveBeenCalledWith('callback-value', element);
        expect(errors.map((error) => error.message)).toEqual(['Field error.', 'Getter error.']);
        expect(window.SvarohJsFormValidator.checkValidationGroups(['Other'], fieldConstraint)).toBe(false);
    });

    test('trims the submitted value the way Symfony does', () => {
        const element = new window.SvarohJsFormElement();
        element.domNode = document.createElement('input');

        // Symfony\Component\Form\Util\StringUtil strips the Unicode
        // separators, controls and format characters off both ends
        element.domNode.value = '  12.5\u00a0';
        expect(window.SvarohJsFormValidator.getInputValue(element)).toBe('12.5');

        element.domNode.value = '\u200e ab \u202c';
        expect(window.SvarohJsFormValidator.getInputValue(element)).toBe('ab');

        element.domNode.value = '   ';
        expect(window.SvarohJsFormValidator.getInputValue(element)).toBe('');

        element.domNode.value = 'a  b';
        expect(window.SvarohJsFormValidator.getInputValue(element)).toBe('a  b');
    });

    test('keeps the value untouched when the element is not trimmed', () => {
        const element = new window.SvarohJsFormElement();
        element.trim = false;
        element.domNode = document.createElement('input');
        element.domNode.value = '  12.5  ';

        expect(window.SvarohJsFormValidator.getInputValue(element)).toBe('  12.5  ');
    });

    test('leaves an element without a node without a value', () => {
        const element = new window.SvarohJsFormElement();

        expect(window.SvarohJsFormValidator.getInputValue(element)).toBeUndefined();
    });

    test('reports a value it cannot reverse transform with the invalid message', () => {
        const element = new window.SvarohJsFormElement();
        element.id = 'profile_percent';
        element.invalidMessage = 'The value {{ value }} is not a number.';
        element.domNode = document.createElement('input');
        element.domNode.value = 'abc';
        element.transformers = [{
            reverseTransform: () => {
                throw new Error('The number contains unrecognized characters: "abc".');
            },
        }];
        const constraint = {
            groups: ['Default'],
            validate: jest.fn(() => ['Field error.']),
        };
        element.data = {
            form: {
                groups: ['Default'],
                constraints: [constraint],
                getters: {},
            },
        };

        const errors = window.SvarohJsFormValidator.validateElement(element);

        expect(errors.map((error) => error.message)).toEqual(['The value "abc" is not a number.']);
        expect(constraint.validate).not.toHaveBeenCalled();

        element.invalidMessage = '';
        expect(window.SvarohJsFormValidator.validateElement(element)[0].message)
            .toBe('The number contains unrecognized characters: "abc".');
    });

    test('checks embedded validity rules and valid constraints', () => {
        const validConstraint = new window.SymfonyComponentValidatorConstraintsValid();
        const element = new window.SvarohJsFormElement();
        element.data.form = { constraints: [validConstraint] };

        expect(window.SvarohJsFormValidator.getElementValidConstraint(element)).toBe(validConstraint);
        expect(window.SvarohJsFormValidator.shouldValidEmbedded(element)).toBe(true);

        const collectionChild = new window.SvarohJsFormElement();
        collectionChild.parent = {
            type: 'Symfony\\Component\\Form\\Extension\\Core\\Type\\CollectionType',
        };

        expect(window.SvarohJsFormValidator.shouldValidEmbedded(collectionChild)).toBe(true);
        expect(window.SvarohJsFormValidator.shouldValidEmbedded(new window.SvarohJsFormElement())).toBe(false);
    });

    test('extracts values from checkbox, select, collection, and mapped children', () => {
        const checkbox = new window.SvarohJsFormElement();
        checkbox.type = 'Symfony\\Component\\Form\\Extension\\Core\\Type\\CheckboxType';
        checkbox.domNode = { checked: true };

        const selectNode = document.createElement('select');
        selectNode.multiple = true;
        selectNode.innerHTML = '<option value="a" selected>A</option><option value="b">B</option><option value="c" selected>C</option>';
        const select = new window.SvarohJsFormElement();
        select.type = '';
        select.domNode = selectNode;

        const child = new window.SvarohJsFormElement();
        child.name = 'child';
        child.domNode = { value: 'child-value', tagName: 'input' };
        const collection = new window.SvarohJsFormElement();
        collection.type = 'Symfony\\Component\\Form\\Extension\\Core\\Type\\CollectionType';
        collection.children = { first: child };

        const mapped = new window.SvarohJsFormElement();
        mapped.children = { child };
        mapped.transformers = [{
            reverseTransform: jest.fn((value) => value.child),
        }];

        expect(window.SvarohJsFormValidator.getElementValue(checkbox)).toBe(true);
        expect(window.SvarohJsFormValidator.getElementValue(select)).toEqual(['c', 'a']);
        expect(window.SvarohJsFormValidator.getElementValue(collection)).toEqual({ first: 'child-value' });
        expect(window.SvarohJsFormValidator.getElementValue(mapped)).toBe('child-value');
    });

    test('finds DOM nodes and forms through ids, names, and descendants', () => {
        document.body.innerHTML = '<form id="profile"><div><input name="profile[email]" value="a@b.test"></div></form>';
        const named = window.SvarohJsFormValidator.findDomElement({
            id: 'missing',
            name: 'profile[email]',
        });
        const formElement = new window.SvarohJsFormElement();
        formElement.id = 'profile';
        formElement.domNode = document.getElementById('profile');
        const child = new window.SvarohJsFormElement();
        child.domNode = named;
        formElement.children.email = child;

        expect(named).toBe(document.getElementsByName('profile[email]')[0]);
        expect(window.SvarohJsFormValidator.findFormElement(formElement)).toBe(formElement.domNode);
        expect(window.SvarohJsFormValidator.findFormElement({ domNode: null, children: { email: child } })).toBe(formElement.domNode);
        expect(window.SvarohJsFormValidator.findParentForm(named)).toBe(formElement.domNode);
        expect(window.SvarohJsFormValidator.findParentForm(document.createTextNode('orphan'))).toBeNull();
        expect(window.SvarohJsFormValidator.findRealChildElement({ domNode: null, children: { email: child } })).toBe(named);
    });

    test('renders, clears, and bubbles errors through DOM helpers', () => {
        document.body.innerHTML = '<form id="profile"><input id="profile_email"></form>';
        const input = document.getElementById('profile_email');
        const element = new window.SvarohJsFormElement();
        element.id = 'profile_email';
        element.domNode = input;

        element.showErrors.apply(input, [['First error.', 'Second error.'], 'source-one']);
        expect(input.previousSibling.className).toBe('form-errors');
        expect(input.previousSibling.childNodes).toHaveLength(2);

        element.showErrors.apply(input, [['Replacement error.'], 'source-one']);
        expect(input.previousSibling.childNodes).toHaveLength(1);
        expect(input.previousSibling.textContent).toBe('Replacement error.');

        element.errors['source-one'] = ['Replacement error.'];
        element.clearErrors('source-one');
        expect(element.errors['source-one']).toEqual([]);

        const root = new window.SvarohJsFormElement();
        const child = new window.SvarohJsFormElement();
        child.parent = root;
        child.bubbling = true;
        root.children.child = child;

        expect(window.SvarohJsFormValidator.getErrorPathElement(child)).toBe(root);
        expect(window.SvarohJsFormValidator.getRootElement(child)).toBe(root);
        expect(window.SvarohJsFormValidator.findErrorDomNode(root)).toBeNull();
    });

    test('bubbles an error to the closest non-bubbling ancestor instead of the form root', () => {
        const buildElement = function (id, parent, bubbling) {
            const element = new window.SvarohJsFormElement();
            element.id = id;
            element.bubbling = bubbling;
            if (parent) {
                element.parent = parent;
                parent.children[id] = element;
            }

            return element;
        };

        // form > materiales (collection) > 0 (item, error_bubbling: false)
        //                                    > material  (error_bubbling: true)
        //                                    > cantidad  (error_bubbling: true)
        const form = buildElement('form', null, false);
        const collection = buildElement('materiales', form, false);
        const firstItem = buildElement('0', collection, false);
        const secondItem = buildElement('1', collection, false);
        const material = buildElement('material', firstItem, true);
        const cantidad = buildElement('cantidad', secondItem, true);

        expect(window.SvarohJsFormValidator.getErrorPathElement(material)).toBe(firstItem);
        expect(window.SvarohJsFormValidator.getErrorPathElement(cantidad)).toBe(secondItem);

        // A whole bubbling chain keeps climbing until it reaches a non-bubbling ancestor
        firstItem.bubbling = true;
        expect(window.SvarohJsFormValidator.getErrorPathElement(material)).toBe(collection);

        // A bubbling element without a parent has nowhere to bubble to
        const orphan = buildElement('orphan', null, true);
        expect(window.SvarohJsFormValidator.getErrorPathElement(orphan)).toBe(orphan);
    });

    test('collects nested errors and utility lengths', () => {
        const root = new window.SvarohJsFormElement();
        root.id = 'root';
        root.errors = { rootSource: ['Root error.'] };
        const child = new window.SvarohJsFormElement();
        child.id = 'child';
        child.errors = { childSource: [] };
        root.children.child = child;

        expect(window.SvarohJsFormValidator.getAllErrors(root, null)).toEqual({
            root: { rootSource: ['Root error.'] },
        });
        expect(window.SvarohJsFormValidator.cloneObject({ nested: { value: 1 }, list: [1, 2] })).toEqual({
            nested: { value: 1 },
            list: [1, 2],
        });
        expect(window.SvarohJsFormValidator.isValueEmty(undefined)).toBe(true);
        expect(window.SvarohJsFormValidator.isValueEmty('')).toBe(true);
        expect(window.SvarohJsFormValidator.isValueEmty('x')).toBe(false);
        expect(window.SvarohJsFormValidator.isValueArray([])).toBe(true);
        expect(window.SvarohJsFormValidator.isValueObject({})).toBe(true);
        expect(window.SvarohJsFormValidator.getValueLength({ a: 1, b: 2 })).toBe(2);
        expect(window.SvarohJsFormValidator.getValueLength(12)).toBeUndefined();
    });

    test('customizes elements and reports unknown methods', () => {
        const domNode = document.createElement('input');
        const element = new window.SvarohJsFormElement();
        element.validate = jest.fn(() => true);
        element.validateRecursively = jest.fn(() => true);
        domNode.jsFormValidator = element;

        window.SvarohJsFormValidator.customize(domNode, {
            customEvents: function () {
                this.customEventsAttached = true;
            },
            onValidate: 'callback',
        });

        expect(domNode.customEventsAttached).toBe(true);
        expect(element.onValidate).toBe('callback');
        expect(window.SvarohJsFormValidator.customize(domNode)).toEqual([element]);
        expect(window.SvarohJsFormValidator.customize(domNode, 'validate', { recursive: true, findUniqueConstraint: false })).toBe(true);
        expect(element.validateRecursively).toHaveBeenCalled();

        global.$ = { error: jest.fn() };
        expect(window.SvarohJsFormValidator.customize(domNode, 'missingMethod')).toBe(window.SvarohJsFormValidator);
        expect(global.$.error).toHaveBeenCalledWith('Method missingMethod does not exist');
    });

    test('serializes and completes ajax requests', () => {
        const ajax = window.SvarohJsFormValidator.ajax;
        const request = {
            open: jest.fn(),
            setRequestHeader: jest.fn(),
            send: jest.fn(),
            readyState: 0,
            status: 0,
            responseText: '',
        };
        ajax.createRequest = jest.fn(() => request);
        const callback = jest.fn();
        const queueCallback = jest.fn();
        ajax.callbacks = [queueCallback];

        expect(ajax.serializeData({ profile: { email: 'a@b.test' }, page: 2 }, null)).toBe('profile%5Bemail%5D=a%40b.test&page=2');

        ajax.sendRequest('/check', { id: 15 }, callback);
        expect(request.open).toHaveBeenCalledWith('POST', '/check', true);
        expect(request.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/x-www-form-urlencoded');
        expect(request.send).toHaveBeenCalledWith('id=15');
        expect(ajax.queue).toBe(1);

        request.readyState = 4;
        request.status = 200;
        request.responseText = 'true';
        request.onreadystatechange();

        expect(callback).toHaveBeenCalledWith('true');
        expect(ajax.queue).toBe(0);
        expect(queueCallback).toHaveBeenCalled();
    });
});
