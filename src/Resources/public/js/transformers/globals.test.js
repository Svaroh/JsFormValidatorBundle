import '../SvarohJsFormValidator';

const namespace = 'SymfonyComponentFormExtensionCoreDataTransformer';

const transformerGlobals = [
    namespace + 'ArrayToPartsTransformer',
    namespace + 'BooleanToStringTransformer',
    namespace + 'ChoiceToBooleanArrayTransformer',
    namespace + 'ChoiceToValueTransformer',
    namespace + 'ChoicesToBooleanArrayTransformer',
    namespace + 'ChoicesToValuesTransformer',
    namespace + 'DataTransformerChain',
    namespace + 'DateTimeToArrayTransformer',
    namespace + 'IntegerToLocalizedStringTransformer',
    namespace + 'MoneyToLocalizedStringTransformer',
    namespace + 'NumberToLocalizedStringTransformer',
    namespace + 'PercentToLocalizedStringTransformer',
    namespace + 'ValueToDuplicatesTransformer',
];

// parseTransformers() instantiates a transformer as Svaroh.transformers[className]
// and skips it without a word when the namespace holds no such name, which is how
// the localized number types went unvalidated in the first place.
test.each(transformerGlobals)(
    'Svaroh.transformers.%s is registered',
    (name) => {
        expect(typeof window.Svaroh.transformers[name]).toBe('function');
    },
);

// The global name of every transformer is kept as a deprecated alias.
test.each(transformerGlobals)(
    'window.%s is a deprecated alias of the namespaced transformer',
    (name) => {
        expect(typeof window[name]).toBe('function');
        expect(window[name]).toBe(window.Svaroh.transformers[name]);
    },
);
