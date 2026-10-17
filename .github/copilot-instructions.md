# Basicrum Analytics for Maho Commerce

This module integrates Boomerang Real User Monitoring into Maho Commerce 26.9+ on PHP 8.3+. Use the Maho documentation and the pinned Maho integration fixture as the platform reference.

- Module: `BasicRum_Analytics`, code pool `local`, version `1.1.0`.
- PHP lives in `app/code/local/BasicRum/Analytics`; keep underscore module class names and the `Mage::` factories used by Maho's module system.
- Use `declare(strict_types=1)`, PHP 8.3+ types, `#[\Override]` on overrides, and Maho namespaced library classes such as `\Maho\Data\Form\Element\AbstractElement`.
- Static source files live under `public/js/basicrum/`; their browser URLs use `/js/basicrum/` through `Mage::getBaseUrl('js')`.
- Keep `modman` mappings in sync with all runtime files. Composer metadata uses `maho-module`; Maho's Composer plugin reads `modman` and publishes `public/` assets.
- Bootstrap Maho with `vendor/autoload.php`. Install with `./maho install`, apply migrations with `./maho migrate`, and refresh generated class maps with `composer dump-autoload` after module changes.
- Preserve the existing `basicrum_analytics/*` configuration paths, all scopes, backend validation, consent defaults, HTTP policy, and inheritance.
- Keep collector identity fields visible while disabled. Runtime controls use native field dependencies. The wait toggle uses the distinct `wait_enabled` form ID and the established `basicrum_analytics/wait_after_onload/enabled` storage path.
- Inject only into the frontend `before_body_end` layout reference. Emit `p_gen=maho`, and preserve page labels and consent callback compatibility.
- Keep the canonical WordPress loader parity checks; regenerate both minified loaders after source changes. Do not modify the vendored Boomerang bundle.
- Test with `php tests/php/run.php`, `npm test`, `bash tests/check-package.sh`, and `bash tests/platform/run.sh maho /path/to/disposable-maho`. The integration runner installs the built ZIP when `BASICRUM_TEST_RELEASE_ZIP` is set and runs Playwright against the real Maho storefront/admin.
- CI targets Maho 26.9.1 on PHP 8.3/8.4/8.5 and MariaDB 10.11. Keep integration fixtures focused on Maho Commerce.
