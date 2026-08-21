import { SvarohJsFormElement } from '../SvarohJsFormValidator';
import SymfonyComponentValidatorConstraintsCallback from './Callback';

const constraintsCallback = new SymfonyComponentValidatorConstraintsCallback();

const elementWithoutCallback = new SvarohJsFormElement();
test('Throw error when SymfonyComponentValidatorConstraintsCallback.collbac is not set', () => {
    expect(() => constraintsCallback.validate(null, elementWithoutCallback)).toThrow();
});


const mockCallback = jest.fn();
constraintsCallback.callback = 'test';

const element = new SvarohJsFormElement();
element.callbacks = {
    'test': mockCallback
};

test('SymfonyComponentValidatorConstraintsCallback', () => {
    expect(() => constraintsCallback.validate(null, element)).not.toThrow();
    expect(mockCallback).toHaveBeenCalledTimes(1);
});
