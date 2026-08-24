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
    'SymfonyComponentValidatorConstraintsFile',
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

// The validator instantiates constraints as Svaroh.constraints[className], so a
// constraint that is not registered in the namespace is silently skipped at
// runtime.
test.each(constraintGlobals)(
    'Svaroh.constraints.%s is registered',
    (name) => {
        expect(typeof window.Svaroh.constraints[name]).toBe('function');
    },
);

// The global name of every constraint is kept as a deprecated alias: user code
// may define custom constraints and Callback handlers against it.
test.each(constraintGlobals)(
    'window.%s is a deprecated alias of the namespaced constraint',
    (name) => {
        expect(typeof window[name]).toBe('function');
        expect(window[name]).toBe(window.Svaroh.constraints[name]);
    },
);
