import './SvarohJsFormValidator';

const validator = window.SvarohJsFormValidator;

describe('the Svaroh namespace', () => {
    test('is the single global the library registers its classes in', () => {
        expect(typeof window.Svaroh).toBe('object');
        expect(typeof window.Svaroh.constraints).toBe('object');
        expect(typeof window.Svaroh.transformers).toBe('object');
    });

    test('a constraint is instantiated from the namespace, not from the global scope', () => {
        const constraintClass = window.SymfonyComponentValidatorConstraintsNotBlank;
        delete window.SymfonyComponentValidatorConstraintsNotBlank;

        try {
            const constraints = validator.parseConstraints({
                'Symfony\\Component\\Validator\\Constraints\\NotBlank': [
                    { message: 'This value should not be blank.' },
                ],
            });

            expect(constraints).toHaveLength(1);
            expect(constraints[0]).toBeInstanceOf(constraintClass);
            expect(constraints[0].message).toBe('This value should not be blank.');
        } finally {
            window.SymfonyComponentValidatorConstraintsNotBlank = constraintClass;
        }
    });

    test('a transformer is instantiated from the namespace, not from the global scope', () => {
        const chainClass = window.SymfonyComponentFormExtensionCoreDataTransformerDataTransformerChain;
        const valueClass = window.SymfonyComponentFormExtensionCoreDataTransformerChoiceToValueTransformer;
        delete window.SymfonyComponentFormExtensionCoreDataTransformerDataTransformerChain;
        delete window.SymfonyComponentFormExtensionCoreDataTransformerChoiceToValueTransformer;

        try {
            const transformers = validator.parseTransformers([
                {
                    name: 'Symfony\\Component\\Form\\Extension\\Core\\DataTransformer\\DataTransformerChain',
                    transformers: [
                        {
                            name: 'Symfony\\Component\\Form\\Extension\\Core\\DataTransformer\\ChoiceToValueTransformer',
                        },
                    ],
                },
            ]);

            expect(transformers).toHaveLength(1);
            expect(transformers[0]).toBeInstanceOf(chainClass);
            expect(transformers[0].transformers).toHaveLength(1);
            expect(transformers[0].transformers[0]).toBeInstanceOf(valueClass);
        } finally {
            window.SymfonyComponentFormExtensionCoreDataTransformerDataTransformerChain = chainClass;
            window.SymfonyComponentFormExtensionCoreDataTransformerChoiceToValueTransformer = valueClass;
        }
    });

    test('an application constraint defined in the global scope is still instantiated', () => {
        window.AppValidatorConstraintsContainsAlphanumeric = function () {
            this.message = '';

            this.validate = function () {
                return [];
            };
        };

        try {
            const constraints = validator.parseConstraints({
                'App\\Validator\\Constraints\\ContainsAlphanumeric': [
                    { message: 'It can only contain letters or numbers.' },
                ],
            });

            expect(constraints).toHaveLength(1);
            expect(constraints[0].message).toBe('It can only contain letters or numbers.');
        } finally {
            delete window.AppValidatorConstraintsContainsAlphanumeric;
        }
    });

    test('an application transformer defined in the global scope is still instantiated', () => {
        window.AppFormDataTransformerMyTransformer = function () {
            this.reverseTransform = function (value) {
                return value;
            };
        };

        try {
            const transformers = validator.parseTransformers([
                { name: 'App\\Form\\DataTransformer\\MyTransformer', extraOption: 'kept' },
            ]);

            expect(transformers).toHaveLength(1);
            expect(transformers[0].extraOption).toBe('kept');
        } finally {
            delete window.AppFormDataTransformerMyTransformer;
        }
    });

    test('an application class registered in the namespace is instantiated', () => {
        window.Svaroh.constraints.AppValidatorConstraintsNamespaced = function () {
            this.message = '';

            this.validate = function () {
                return [];
            };
        };

        try {
            const constraints = validator.parseConstraints({
                'App\\Validator\\Constraints\\Namespaced': [{ message: 'Namespaced.' }],
            });

            expect(constraints).toHaveLength(1);
            expect(constraints[0].message).toBe('Namespaced.');
        } finally {
            delete window.Svaroh.constraints.AppValidatorConstraintsNamespaced;
        }
    });

    test('a name the namespace and the global scope do not know is skipped', () => {
        expect(validator.parseConstraints({
            'App\\Validator\\Constraints\\Unknown': [{ message: 'Unknown.' }],
        })).toStrictEqual([]);

        expect(validator.parseTransformers([
            { name: 'App\\Form\\DataTransformer\\Unknown' },
        ])).toStrictEqual([]);
    });
});
