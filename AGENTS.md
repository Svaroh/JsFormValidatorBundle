# Agent Notes

Repository: `Svaroh/JsFormValidatorBundle` (default branch: `main`)
Upstream 1.x repository: `formapro/JsFormValidatorBundle`
Local path: `/Volumes/SRC/svaroh/JsFormValidatorBundle`

## Current Repository State

- This repository is a new home for the bundle. `formapro/JsFormValidatorBundle`
  keeps the `fp/jsformvalidator-bundle` Composer package.
- `svaroh/jsformvalidator-bundle` is a new package versioned from `1.0`; it does
  not continue the `fp/jsformvalidator-bundle` version numbers. It is not
  published on Packagist yet, so the README download badge stays broken until it
  is.
- The move renames the vendor namespace, bundle class, DI alias, JavaScript
  globals, and Composer package from `Fp`/`fp` to `Svaroh`/`svaroh`.
- History that predates the move lives in `formapro/JsFormValidatorBundle`,
  where `1.7.0-beta1` and `1.8.0` were published from `master`.
- PR #1 (`rebrand/svaroh-2.0`) carried the rebrand into this repository.

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
- No workflow run has been recorded in this repository yet; the first push to
  `main` after the branch filter fix will be the first real run.

## Local Validation

Last verified in the Nix shell on PHP 8.5.6 / Node 24.16.0:

- `composer test`: 33 tests, 104 assertions.
- `composer phpstan`: no errors.
- `composer coverage`: PHP line coverage ~98%, threshold `80%`.
- `npm run test:unit`: Jest 266 tests.
- `npm run test:coverage`: JavaScript line coverage ~87%, threshold `80%`.
- `npm test`: the above plus the Cypress e2e suite, 17 tests.

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

- `Controller/AjaxController::checkUniqueEntityAction` takes `entityName` and
  `repositoryMethod` from the request. Input is validated, but the endpoint is
  still an existence oracle for any entity unless the application secures the
  route or replaces the controller. Documented in
  `src/Resources/doc/3_9.md`.
