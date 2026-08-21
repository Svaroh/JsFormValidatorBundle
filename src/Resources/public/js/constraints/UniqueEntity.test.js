import '../SvarohJsFormValidator';
import SvarohJsFormValidatorBundleFormConstraintUniqueEntity from './UniqueEntity';

describe('SvarohJsFormValidatorBundleFormConstraintUniqueEntity', () => {
    afterEach(() => {
        window.SvarohJsFormValidator.config = {};
        jest.restoreAllMocks();
    });

    test('sends the current entity id with the uniqueness request', () => {
        const constraint = new SvarohJsFormValidatorBundleFormConstraintUniqueEntity();
        constraint.fields = ['email'];
        constraint.entityName = 'App\\Entity\\User';
        constraint.entityId = 15;
        constraint.uniqueId = 1;

        window.SvarohJsFormValidator.config = {
            routing: {
                check_unique_entity: '/check_unique_entity',
            },
        };

        const sendRequest = jest
            .spyOn(window.SvarohJsFormValidator.ajax, 'sendRequest')
            .mockImplementation(() => {});

        const element = {
            children: {
                email: {
                    name: 'email',
                    type: '',
                    transformers: [],
                    children: {},
                    domNode: {
                        tagName: 'input',
                        value: 'john@example.com',
                    },
                },
            },
        };

        expect(constraint.validate(null, element)).toStrictEqual([]);
        expect(sendRequest).toHaveBeenCalledWith(
            '/check_unique_entity',
            expect.objectContaining({
                entityName: 'App\\Entity\\User',
                entityId: 15,
                data: {
                    email: 'john@example.com',
                },
            }),
            expect.any(Function),
        );
    });
});
