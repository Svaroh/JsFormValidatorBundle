//noinspection JSUnusedGlobalSymbols
/**
 * Created by ymaltsev on 11/26/13.
 */
export default function SvarohJsFormValidatorBundleFormConstraintUniqueEntity() {
    this.message          = 'This value is already used.';
    this.service          = 'doctrine.orm.validator.unique';
    this.em               = null;
    this.repositoryMethod = 'findBy';
    this.fields           = [];
    this.errorPath        = null;
    this.ignoreNull       = true;
    this.entityName       = null;
    this.entityId         = null;

    this.groups           = [];

    /**
     * @param {*} value
     * @param {SvarohJsFormElement} element
     */
    this.validate = function(value, element) {
        var self   = this;
        var route  = null;
        var config = SvarohJsFormValidator.config;
        var errorPath = this.getErrorPathElement(element);

        if (config['routing'] && config['routing']['check_unique_entity']) {
            route = config['routing']['check_unique_entity'];
        }

        if (!route) {
            return [];
        }

        SvarohJsFormValidator.ajax.sendRequest(
            route,
            {
                message:          this.message,
                service:          this.service,
                em:               this.em,
                repositoryMethod: this.repositoryMethod,
                fields:           this.fields,
                errorPath:        this.errorPath,
                ignoreNull:       this.ignoreNull ? 1 : 0,
                groups:           this.groups,

                entityId:         this.entityId,
                entityName:       this.entityName,
                data:             this.getValues(element, this.fields)
            },
            function(response){
                response = JSON.parse(response);
                var errors = [];
                if (false === response) {
                    errors.push(self.message);
                }
                SvarohJsFormValidator.customize(errorPath.domNode, 'showErrors', {
                    errors: errors,
                    sourceId: 'unique-entity-' + self.uniqueId
                });
            }
        );

        return [];
    };

    this.onCreate = function() {
        if (typeof this.fields === 'string') {
            this.fields = [this.fields];
        }
    };

    /**
     * @param {SvarohJsFormElement} element
     * @param {Array} fields
     * @returns {{}}
     */
    this.getValues = function(element, fields) {
        var value;
        var result = {};
        for (var i = 0; i < fields.length; i++) {
            value = SvarohJsFormValidator.getElementValue(element.children[this.fields[i]]);
            value = value ? value : '';
            result[fields[i]] = value;
        }

        return result;
    };

    /**
     * @param {SvarohJsFormElement} element
     * @return {SvarohJsFormElement}
     */
    this.getErrorPathElement = function(element) {
        var errorPath = this.fields[0];
        if (this.errorPath) {
            errorPath = this.errorPath;
        }

        return element.children[errorPath];
    }
}

window.SvarohJsFormValidatorBundleFormConstraintUniqueEntity = SvarohJsFormValidatorBundleFormConstraintUniqueEntity;
