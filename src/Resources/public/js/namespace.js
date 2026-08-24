/**
 * The namespace the library registers its constraints and transformers in.
 *
 * The PHP side serialises the class name of every constraint and of every view
 * transformer into the form model, and the browser side instantiates them by
 * that name with the namespace separators removed. Each of those names used to
 * be a separate property of "window", which is what the "Add namespace in JS
 * lib" issue objects to.
 *
 * The name mirrors the "Svaroh\JsFormValidatorBundle" PHP namespace and the
 * "Svaroh" prefix the library already uses for its own globals. The object is
 * merged into whatever is on "window.Svaroh" already, so an application that
 * owns a "Svaroh" object of its own keeps it.
 *
 * An application registers its own constraint like this:
 *
 *     Svaroh.constraints.AppValidatorConstraintsContainsAlphanumeric = function () {
 *         // ...
 *     };
 *
 * Constraints and transformers that are only defined as globals keep working:
 * the lookup falls back to the global scope, see
 * SvarohJsFormValidator.resolveClass().
 */
var Svaroh = window.Svaroh || {};

Svaroh.constraints = Svaroh.constraints || {};
Svaroh.transformers = Svaroh.transformers || {};

window.Svaroh = Svaroh;

export default Svaroh;
