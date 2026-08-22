//noinspection JSUnusedGlobalSymbols
export default function SymfonyComponentFormExtensionCoreDataTransformerValueToDuplicatesTransformer() {
    this.keys = [];

    /**
     *
     * @param {{}} value
     * @param {SvarohJsFormElement} element
     */
    this.reverseTransform = function(value, element) {
        var initialValue = undefined;
        var errors = [];
        for (var key in value) {
            if (undefined === initialValue) {
                initialValue = value[key];
            }

            if (value[key] !== initialValue) {
                errors.push(element.invalidMessage);
                break;
            }
        }

        // Symfony reports the mismatch on the first child, which is not part
        // of the model when its own validation is disabled
        var child = element.children[this.keys[0]];
        if (child) {
            SvarohJsFormValidator.customize(child.domNode, 'showErrors', {
                errors: errors,
                sourceId: 'value-to-duplicates-' + child.id
            });
        }

        return initialValue;
    }
}

window.SymfonyComponentFormExtensionCoreDataTransformerValueToDuplicatesTransformer = SymfonyComponentFormExtensionCoreDataTransformerValueToDuplicatesTransformer;