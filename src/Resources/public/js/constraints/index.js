import Svaroh from '../namespace.js';

import SymfonyComponentValidatorConstraintsBlank from './Blank.js';
import SymfonyComponentValidatorConstraintsCallback from './Callback.js';
import SymfonyComponentValidatorConstraintsChoice from './Choice.js';
import SymfonyComponentValidatorConstraintsCount from './Count.js';
import SymfonyComponentValidatorConstraintsDate from './Date.js';
import SymfonyComponentValidatorConstraintsDateTime from './DateTime.js';
import SymfonyComponentValidatorConstraintsEmail from './Email.js';
import SymfonyComponentValidatorConstraintsEqualTo from './EqualTo.js';
import SymfonyComponentValidatorConstraintsFile from './File.js';
import SymfonyComponentValidatorConstraintsGreaterThan from './GreaterThan.js';
import SymfonyComponentValidatorConstraintsGreaterThanOrEqual from './GreaterThanOrEqual.js';
import SymfonyComponentValidatorConstraintsIdenticalTo from './IdenticalTo.js';
import SymfonyComponentValidatorConstraintsIp from './Ip.js';
import SymfonyComponentValidatorConstraintsIsFalse from './IsFalse.js';
import SymfonyComponentValidatorConstraintsIsNull from './IsNull.js';
import SymfonyComponentValidatorConstraintsIsTrue from './IsTrue.js';
import SymfonyComponentValidatorConstraintsLength from './Length.js';
import SymfonyComponentValidatorConstraintsLessThan from './LessThan.js';
import SymfonyComponentValidatorConstraintsLessThanOrEqual from './LessThanOrEqual.js';
import SymfonyComponentValidatorConstraintsLuhn from './Luhn.js';
import SymfonyComponentValidatorConstraintsNotBlank from './NotBlank.js';
import SymfonyComponentValidatorConstraintsNotEqualTo from './NotEqualTo.js';
import SymfonyComponentValidatorConstraintsNotIdenticalTo from './NotIdenticalTo.js';
import SymfonyComponentValidatorConstraintsNotNull from './NotNull.js';
import SymfonyComponentValidatorConstraintsRange from './Range.js';
import SymfonyComponentValidatorConstraintsRegex from './Regex.js';
import SymfonyComponentValidatorConstraintsTime from './Time.js';
import SymfonyComponentValidatorConstraintsType from './Type.js';
import SvarohJsFormValidatorBundleFormConstraintUniqueEntity from './UniqueEntity.js';
import SymfonyComponentValidatorConstraintsUrl from './Url.js';
import SymfonyComponentValidatorConstraintsValid from './Valid.js';

// The constraints are keyed by the name the PHP side serialises them under:
// their class name with the namespace separators removed. Every module also
// still assigns that name on "window" as a deprecated alias.
Object.assign(Svaroh.constraints, {
    SymfonyComponentValidatorConstraintsBlank,
    SymfonyComponentValidatorConstraintsCallback,
    SymfonyComponentValidatorConstraintsChoice,
    SymfonyComponentValidatorConstraintsCount,
    SymfonyComponentValidatorConstraintsDate,
    SymfonyComponentValidatorConstraintsDateTime,
    SymfonyComponentValidatorConstraintsEmail,
    SymfonyComponentValidatorConstraintsEqualTo,
    SymfonyComponentValidatorConstraintsFile,
    SymfonyComponentValidatorConstraintsGreaterThan,
    SymfonyComponentValidatorConstraintsGreaterThanOrEqual,
    SymfonyComponentValidatorConstraintsIdenticalTo,
    SymfonyComponentValidatorConstraintsIp,
    SymfonyComponentValidatorConstraintsIsFalse,
    SymfonyComponentValidatorConstraintsIsNull,
    SymfonyComponentValidatorConstraintsIsTrue,
    SymfonyComponentValidatorConstraintsLength,
    SymfonyComponentValidatorConstraintsLessThan,
    SymfonyComponentValidatorConstraintsLessThanOrEqual,
    SymfonyComponentValidatorConstraintsLuhn,
    SymfonyComponentValidatorConstraintsNotBlank,
    SymfonyComponentValidatorConstraintsNotEqualTo,
    SymfonyComponentValidatorConstraintsNotIdenticalTo,
    SymfonyComponentValidatorConstraintsNotNull,
    SymfonyComponentValidatorConstraintsRange,
    SymfonyComponentValidatorConstraintsRegex,
    SymfonyComponentValidatorConstraintsTime,
    SymfonyComponentValidatorConstraintsType,
    SvarohJsFormValidatorBundleFormConstraintUniqueEntity,
    SymfonyComponentValidatorConstraintsUrl,
    SymfonyComponentValidatorConstraintsValid,

    // The names the False, Null and True constraints had before Symfony 2.7
    // renamed them, they are still reachable as class aliases in PHP
    SymfonyComponentValidatorConstraintsFalse: SymfonyComponentValidatorConstraintsIsFalse,
    SymfonyComponentValidatorConstraintsNull: SymfonyComponentValidatorConstraintsIsNull,
    SymfonyComponentValidatorConstraintsTrue: SymfonyComponentValidatorConstraintsIsTrue,
});
