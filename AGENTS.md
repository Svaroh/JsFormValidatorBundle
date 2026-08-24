# Agent Notes

Repository: `Svaroh/JsFormValidatorBundle` (default branch: `main`)

## CI

- `.github/workflows/ci.yml` runs on `pull_request` and on `push` to `main`.
- The PHP job runs on PHP `8.4`, `8.5`, and `8.6` nightly. It runs
  `composer update`, `composer validate --strict`, and `composer test`.
- The JavaScript job runs on Node `24` with PHP `8.5`. It installs Cypress
  system dependencies, then runs `composer update`, `npm install`, `npm test`.
- The PHPStan job runs on PHP `8.5`, warms the Symfony test cache, and runs
  `composer phpstan` (level 5).
- The Coverage job runs on PHP `8.5` with Xdebug and Node `24`, then runs
  `composer coverage` and `npm run test:coverage`.
- Coverage generates Cobertura XML, uploads it with
  `actions/upload-code-coverage@v1` when GitHub permissions allow, and keeps raw
  reports as workflow artifacts.
- Coverage thresholds are enforced by `tools/check-coverage.php`: PHP and
  JavaScript line coverage at least `80%`.
- The coverage upload step answers `403` until "Code quality" is enabled on the
  repository, which `fail-on-error: false` keeps a warning; the report artifact
  is produced either way.

## Local Validation

Last verified in the Nix shell on PHP 8.5.6 / Node 24.16.0:

- `composer test`: 81 tests, 250 assertions.
- `composer phpstan`: no errors.
- `composer coverage`: PHP line coverage ~97%, threshold `80%`.
- `npm run test:unit`: Jest 608 tests.
- `npm run test:coverage`: JavaScript line coverage ~95%, threshold `80%`.
- `npm test`: the above plus the Cypress e2e suite, 24 tests.

## Nix Development Environment

- Prefer `nix develop` from the repository root when Nix is available.
- The Nix shell provides the latest PHP available in pinned nixpkgs with Xdebug
  coverage support, Composer, Node.js 24, npm, zip/unzip, and Linux Cypress
  runtime libraries. It currently resolves to PHP 8.5.
- The Docker `php-fpm` development image is maintained for vendor installation
  and ad hoc commands. It uses PHP 8.5, Composer 2, Node.js 24, and the PHP
  extensions required by the Symfony 8 fixture.
- Run one-off commands with `nix develop -c <command>`, for example:
  - `nix develop -c composer validate --strict`
  - `nix develop -c composer test`
  - `nix develop -c composer phpstan`
  - `nix develop -c composer coverage`
  - `nix develop -c npm test`
  - `nix develop -c npm run test:coverage`
- On a fresh checkout, run `nix develop -c npm install` first; if Cypress reports
  a missing binary, run `nix develop -c npx cypress install`.
- If flakes are not enabled globally, prefix commands with
  `nix --extra-experimental-features "nix-command flakes"`.
- `.envrc` uses `use flake`; run `direnv allow` once if using direnv.
- The host PHP outside the Nix shell is 8.3, below the `^8.4` requirement, so run
  the checks inside the shell.

## Known Design Risks

- `Controller/AjaxController::checkUniqueEntityAction` no longer trusts the
  request to select the lookup. The request may only replay a `UniqueEntity`
  constraint the application registered on the named class: the field
  combination must match a constraint exactly, and the repository method,
  `ignoreNull` and `entityClass` are read from that constraint instead of the
  request. Criteria values must be scalar or null, so an array can no longer
  widen the query. Doctrine is never reached for an undeclared lookup.
- What remains, and belongs to the application: for the field combinations the
  application did itself declare unique, the route is still an unauthenticated
  existence oracle (`is this email registered?`) and is not rate limited. Secure
  or throttle the route in the host application. Documented in
  `src/Resources/doc/3_9.md`.
- A `UniqueEntity` passed inline through a form's `constraints` option is not in
  the class validation metadata, so the endpoint refuses it. Declare
  `UniqueEntity` on the entity class, or point the bundle at a custom
  controller.
