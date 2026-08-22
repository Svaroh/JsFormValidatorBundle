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

// parseTransformers() instantiates a transformer as window[className] and skips
// it without a word when the global is undefined, which is how the localized
// number types went unvalidated in the first place.
test.each(transformerGlobals)(
    'window.%s is registered',
    (name) => {
        expect(typeof window[name]).toBe('function');
    },
);
