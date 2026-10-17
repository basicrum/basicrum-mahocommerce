# Maho Commerce port

The compatibility baseline is Maho **26.9.1**, commit
`bbc0a6158a902fe03324377a7f142c45c38f2f59`, released on October 6, 2026.
The integration workflow checks that release on PHP 8.3, 8.4, and 8.5 with
MariaDB 10.11. New Maho releases should be tested before changing this pin.

## Platform conventions

- Keep `BasicRum_Analytics` and its underscore class names. Maho retains this
  XML module, block, helper, configuration, and layout architecture.
- Use the documented `app/code/local/BasicRum/Analytics` location and `local`
  code pool for this extension. No platform core files are changed.
- Use PHP 8.3+ and `Maho\Data\Form\Element\AbstractElement` in the custom admin
  renderers, with `#[\Override]` on overridden framework methods.
- Put JavaScript under `public/js/basicrum`. Generate browser URLs through
  `Mage::getBaseUrl('js')`, without a `/public` URL prefix.
- Declare the Composer package as `maho-module`. Maho's Composer plugin reads
  the `modman` manifest, discovers the module classes and XML, and publishes
  its `public/` assets. Keep the package's existing GPL license.
- Bootstrap installed stores with `vendor/autoload.php`. After deployment,
  run `composer dump-autoload`, `./maho migrate`, and `./maho cache:flush`.
- Retain the existing setup script and configuration paths. This extension
  adds no tables, so it needs no declarative table schema. Maho's migration
  runner executes its inherited configuration migration.

The frontend layout hook remains `before_body_end`; monitoring stays out of
the admin area. Consent callbacks, scoped settings, validation, Boomerang
bytes, and established page labels remain compatible. The platform beacon
identifier is `maho`.

## Test coverage

`tests/platform/run.sh maho /path/to/disposable-maho` installs the platform
using the Maho CLI and runs native setup, configuration, admin save/render,
inheritance, and upgrade checks. Set `BASICRUM_TEST_RELEASE_ZIP` to the built
archive to test exactly the packaged bytes. Invalid archives fail before
deployment.

`tests/platform/verify-live.sh` starts a PHP server with Maho's `public/`
document root. It configures disabled, immediate, and consent modes and runs
`tests/e2e/storefront.spec.js` against the real installation. Only collector
responses are intercepted; Maho serves the storefront, admin, loaders, and
Boomerang bundle. Tests check `p_gen=maho`, site identity, home/cart page
labels, consent before loading, withdrawal, fresh-page consent, admin login,
and delivery of the admin copy helper.

The standalone loader suite still verifies the source and minified assets
against the canonical WordPress implementation. It complements the Maho
installation tests.

## References consulted

- [Maho installation, requirements, public directory, and CLI](https://mahocommerce.com/about/getting-started/)
- [Module structure and XML configuration](https://mahocommerce.com/developer/guide/introduction/)
- [Framework changes and namespaced library classes](https://mahocommerce.com/about/origins/)
- [Maho Composer plugin and preferred modman mappings](https://github.com/MahoCommerce/maho-composer-plugin/blob/v4.6.0/README.md)
- [Maho 26.9.1 source conventions](https://github.com/MahoCommerce/maho/blob/26.9.1/AGENTS.md)
- [Maho 26.9.1 release](https://github.com/MahoCommerce/maho/releases/tag/26.9.1)
