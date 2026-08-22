import '../SvarohJsFormValidator';

const constraintGlobals = [
    'SvarohJsFormValidatorBundleFormConstraintUniqueEntity',
    'SymfonyComponentValidatorConstraintsBlank',
    'SymfonyComponentValidatorConstraintsCallback',
    'SymfonyComponentValidatorConstraintsChoice',
    'SymfonyComponentValidatorConstraintsCount',
    'SymfonyComponentValidatorConstraintsDate',
    'SymfonyComponentValidatorConstraintsDateTime',
    'SymfonyComponentValidatorConstraintsEmail',
    'SymfonyComponentValidatorConstraintsEqualTo',
    'SymfonyComponentValidatorConstraintsFalse',
    'SymfonyComponentValidatorConstraintsGreaterThan',
    'SymfonyComponentValidatorConstraintsGreaterThanOrEqual',
    'SymfonyComponentValidatorConstraintsIdenticalTo',
    'SymfonyComponentValidatorConstraintsIp',
    'SymfonyComponentValidatorConstraintsIsFalse',
    'SymfonyComponentValidatorConstraintsIsNull',
    'SymfonyComponentValidatorConstraintsIsTrue',
    'SymfonyComponentValidatorConstraintsLength',
    'SymfonyComponentValidatorConstraintsLessThan',
    'SymfonyComponentValidatorConstraintsLessThanOrEqual',
    'SymfonyComponentValidatorConstraintsLuhn',
    'SymfonyComponentValidatorConstraintsNotBlank',
    'SymfonyComponentValidatorConstraintsNotEqualTo',
    'SymfonyComponentValidatorConstraintsNotIdenticalTo',
    'SymfonyComponentValidatorConstraintsNotNull',
    'SymfonyComponentValidatorConstraintsNull',
    'SymfonyComponentValidatorConstraintsRange',
    'SymfonyComponentValidatorConstraintsRegex',
    'SymfonyComponentValidatorConstraintsTime',
    'SymfonyComponentValidatorConstraintsTrue',
    'SymfonyComponentValidatorConstraintsType',
    'SymfonyComponentValidatorConstraintsUrl',
    'SymfonyComponentValidatorConstraintsValid',
];

// The validator instantiates constraints as window[className], so a constraint
// that is not exported to the global scope is silently skipped at runtime.
test.each(constraintGlobals)(
    'window.%s is registered',
    (name) => {
        expect(typeof window[name]).toBe('function');
    },
);
