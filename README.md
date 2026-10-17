# Basicrum Analytics for Maho Commerce

Basicrum Analytics integrates Maho Commerce stores with a Basicrum collector using the bundled Boomerang Real User Monitoring library.

## Requirements

- Maho Commerce 26.9 or newer
- PHP 8.3 or newer (subject to the requirements of your Maho release)
- A Beacon Endpoint and matching Brum Site ID supplied by the Basicrum backend

## Installation

### Composer

The package uses Maho's `maho-module` type and its Composer plugin. Once the package is available through your configured Composer repository:

```bash
cd /path/to/maho
composer require basicrum/basicrum-mahocommerce
./maho migrate --no-interaction
./maho cache:flush
```

For an unpublished checkout, add it as a Composer `path` repository and require `basicrum/basicrum-mahocommerce:@dev`. Maho discovers the module's code and copies its `public/` assets through its Composer plugin.

### Modman

```bash
cd /path/to/maho
modman clone https://github.com/basicrum/basicrum-mahocommerce.git
```

### Manual installation

Download the versioned `basicrum-mahocommerce-<version>.zip` asset and its `.sha256`
file from the [GitHub releases](https://github.com/basicrum/basicrum-mahocommerce/releases).
Verify the checksum, then extract the ZIP. The extension is inside the
`basicrum-mahocommerce/` directory. GitHub's automatic source-code archives are
repository snapshots, not the filtered installation package.

Copy these paths into the matching locations under the Maho root:

- `app/code/local/BasicRum/Analytics`
- `app/etc/modules/BasicRum_Analytics.xml`
- `app/design/frontend/base/default/layout/basicrum_analytics.xml`
- `app/locale/en_US/BasicRum_Analytics.csv`
- `public/js/basicrum`

After installing or upgrading, regenerate Composer's class map, apply pending setup scripts, and clear the caches:

```bash
composer dump-autoload
./maho migrate --no-interaction
./maho cache:flush
```

Your web server's document root must be Maho's `public/` directory. Asset URLs remain `/js/basicrum/...`; do not add `/public` to storefront URLs.

When replacing a previous Magento/OpenMage installation of this module, remove its old `app/code/community/BasicRum/Analytics` directory before deploying this port. Keep the module declaration only once, using the `local` code pool. Existing `basicrum_analytics/*` configuration and setup-resource records are retained.

## Configuration

Go to **System > Configuration > Basicrum > Basicrum Settings**. Configuration remains available at Maho's default, website, and store scopes.

**Enable Basicrum** defaults to **No (disabled)**. General Settings includes the collector identity, **Strip Query Strings**, **Require Consent Before Monitoring**, and consent integration guidance. The privacy controls retain their existing `basicrum_analytics/privacy/*` configuration paths and scoped values; only their placement in the admin changes.

Monitoring scripts are emitted only when all of these conditions are met:

- **Enable Basicrum** is set to Yes.
- **Beacon Endpoint** is a valid HTTP or HTTPS URL.
- **Brum Site ID** is a valid RFC 4122 UUID v4.

Both identity values are mandatory. Runtime validation is performed again when rendering, so missing, malformed, or programmatically injected values fail closed even if they bypass the admin backend models. Dynamic JavaScript values are JSON encoded with HTML-significant characters escaped.

The status panel reports whether monitoring is Disabled, Blocked by invalid or incomplete identity configuration, Waiting for consent, or Active in immediate mode.

When **Enable Basicrum** is set to No, Maho keeps the bundled Boomerang version, Beacon Endpoint, and Brum Site ID visible so an administrator can prepare or inspect the identity configuration before enabling monitoring. Privacy, wait, and developer runtime controls are hidden and disabled through Maho's native field dependencies. Their stored default, website, and store-view values are retained and reappear when monitoring is enabled; normal scope inheritance and **Use Default/Use Website** behavior are unchanged.

HTTPS Beacon Endpoints are enforced by default. The Developer setting **HTTP Strictness** can allow HTTP only for local testing; do not enable it on production stores. When strict mode is active, an HTTP URL saved through the admin is upgraded to HTTPS, and runtime rendering applies the same upgrade to values injected outside the admin path. HTTPS storefronts always upgrade HTTP Beacon Endpoints to HTTPS to prevent mixed-content blocking, even when HTTP is allowed by the selected policy.

### Query-string privacy

**Strip Query Strings** controls Boomerang's native URL redaction. It remains disabled by default to preserve the established Maho Commerce behavior and match the WordPress default. When enabled, complete query strings in page, navigation, referrer, and resource URLs are replaced with `?qs-redacted` before beacons are sent; URL paths remain available for performance analysis.

This setting does not modify query parameters in the configured Beacon Endpoint. Those parameters are part of the collector destination and continue to be safely serialized unchanged.

### Consent-controlled loading

**Require Consent Before Monitoring** is the privacy-first default for new installations. In this mode the loader remains inert until an external consent tool explicitly calls the opt-in callback on the current page:

```javascript
if (typeof window.OPT_IN_BASICRUM_LOADER_WRAPPER === 'function') {
    window.OPT_IN_BASICRUM_LOADER_WRAPPER();
}
```

Call the opt-out callback whenever monitoring is denied or withdrawn:

```javascript
if (typeof window.OPT_OUT_BASICRUM_LOADER_WRAPPER === 'function') {
    window.OPT_OUT_BASICRUM_LOADER_WRAPPER();
}
```

Basicrum does not show a consent dialog, determine the site's legal basis, persist a consent choice, or trust a decision from an earlier page. The external consent tool remains the source of truth and must signal the current decision on each page.

For backward compatibility, integrations migrated from Magento 1 may continue calling:

- `window.OPT_IN_BASIC_RUM()`
- `window.OPT_OUT_BASIC_RUM()`

They are aliases of the canonical callbacks above.

Repeated opt-in calls inject Boomerang only once. Opt-out before the first opt-in clears RUM and legacy consent cookies but retains the in-page configuration, so a later allow decision on that page can start monitoring. Opt-out during download neutralizes the configuration before the bundle can initialize. Opt-out after initialization disables Boomerang. Once loading has started and consent is withdrawn, re-granting does not restart monitoring on that page; reload the page and let the external tool report the new allow decision. Opt-out stops future browser collection but cannot retract beacon data already sent to the configured collector.

When monitoring runs, Boomerang sets a first-party `RT` cookie at path `/`. It contains a random session identifier that links monitored page views, uses a 30-minute session window, and has a rolling seven-day expiry. It uses `SameSite=Strict` and is marked `Secure` on HTTPS sites. `BA` is a legacy Boomerang cookie. Opt-out removes `RT`, `BA`, and the legacy `BRUM_CONSENT` and `BOOMR_CONSENT` cookies across applicable host-domain paths. The extension never creates either consent cookie.

### Upgrade behavior in 1.1.0

Version 1.1.0 introduces a versioned Maho setup resource for the privacy default:

- A genuinely new installation with no `basicrum_analytics/*` rows in `core_config_data` gets an explicit default-scope `opt_in_required=1`.
- An upgraded store with an existing Basicrum configuration footprint and no explicit default-scope consent value gets `opt_in_required=0`, preserving the historical immediate-monitoring behavior.
- An existing explicit default-scope consent value is never overwritten. Website and store overrides continue to inherit or override through normal Maho scope rules.
- Existing HTTP Beacon Endpoints keep their policy after upgrade: for every explicit Beacon Endpoint, the installer records a matching policy at the same scope (`HTTP` remains allowed and `HTTPS` remains strict) unless that scope already contains an explicit policy decision. Descendant scopes continue to inherit normally, and new installations remain HTTPS-strict. As before, HTTPS storefronts upgrade HTTP Beacon Endpoints to HTTPS regardless of that policy.
- A previously installed but never configured and disabled module is treated like a new installation; this cannot start monitoring because **Enable**, Beacon Endpoint, and Site ID are still required.

The migration policies live in `BasicRum_Analytics_Model_Setup_PrivacyDefault` and `BasicRum_Analytics_Model_Setup_HttpPolicyDefault` and are covered by the PHP and native-platform test harnesses.

Two 1.1.0 changes can intentionally stop monitoring until configuration or consent integration is corrected:

- Beacon Endpoint and Brum Site ID are now both mandatory, and the Site ID must be a UUID v4. A store with an empty or previously accepted non-v4 Site ID emits no monitoring scripts until a valid backend identifier is saved.
- Basicrum no longer resumes from a `BRUM_CONSENT` cookie. In consent-controlled mode, the external consent tool must call the opt-in callback on every page after the Basicrum loader has registered it near the end of the document. Calls made before registration are not queued or replayed.

### Wait After Onload

Enable this option to delay the page-load beacon while collecting additional metrics. The canonical configuration path is:

```text
basicrum_analytics/wait_after_onload/wait_ms
```

Values are clamped to 0–30000 milliseconds. The older mismatched `ms` default key is no longer used.

### Maho-specific administrator and script behavior

WordPress can exclude logged-in users with the `manage_options` capability because its administrators and storefront visitors share the same user system. Maho admin users authenticate in the separate `adminhtml` application and do not have a reliable frontend identity. Basicrum is not emitted on Maho admin pages, and a backend user visiting the storefront is indistinguishable from any other storefront visitor without initializing an admin session in the frontend. For that reason Maho Commerce does not expose a misleading **Track Admin Users** setting. Stores that need staff-traffic exclusion should use collector-side rules or a separately designed frontend signal.

Maho inserts the configuration and async loader in the native `before_body_end` layout reference. This is the documented, fixed equivalent of WordPress's default footer placement. A Header/Footer selector is intentionally not provided: moving the consent loader to the header would alter registration timing and could start immediate-mode downloads earlier, while Maho themes do not provide a single portable header insertion point equivalent to WordPress's `wp_head`.

## Page type compatibility

Beacons identify this platform with `p_gen=maho`. The established page labels remain unchanged, including `Home`, `Product`, `Cart`, and `404 Not Found`. Existing collector dashboards can distinguish Maho stores without changing those page labels.

## Automated verification

PHP configuration and rendering tests use a lightweight Maho test harness and do not require a full Maho installation:

```bash
php tests/php/run.php
```

Browser tests use Playwright and exercise both source and minified loaders in Chromium, including immediate loading, current-page consent, repeated opt-in, and opt-out before loading, during download, and after initialization:

```bash
npm ci
npx playwright install chromium
npm test
```

The WordPress loaders are the source of truth. `tests/js/wordpress-parity.spec.js`
pins their source/minified SHA-256 hashes and the Boomerang bundle to WordPress
commit `64f19d9e5a9fbe580c12c19796e86e3ad0dd17ff`. It also requires the consent
wrapper to embed the standard loader byte-for-byte. These checks run in the
normal CI suite without a WordPress checkout or network access.

The only allowed consent-wrapper additions are Maho's legacy callback
aliases, legacy consent-cookie cleanup, and its existing Wait After Onload
timer cancellation/withdrawal guard. The parity test removes only these exact
additions before checking the WordPress hash; unexpected differences fail.
General loader behavior changes should be reviewed in WordPress first, then
ported here with the baseline updated explicitly. Do not remove Maho's
existing withdrawal protection just to match the current WordPress wrapper.

To also verify the baseline against a local WordPress checkout:

```bash
BASICRUM_WORDPRESS_ROOT=/path/to/basicrum-wordpress npm test
```

When updating the baseline, compare both WordPress loaders, retain only the
documented Maho additions, regenerate the minified files, update the pinned
revision/hashes and notices, and run the browser suite against the real bundle.
Script placement and callback registration timing remain Maho-specific;
this port does not add automatic consent-provider adapters or change the
underlying Boomerang shutdown behavior.

Run XML, Modman, Boomerang checksum, and temporary release-archive verification
with Node.js 20+, `xmllint`, `zip`, `unzip`, and `sha256sum` or `shasum` installed:

```bash
bash tests/check-package.sh
```

Regenerate both minified loaders after changing either source file:

```bash
npm run build:loaders
```

GitHub Actions runs PHP syntax and configuration tests on PHP 8.3, 8.4, and 8.5, plus the loader browser suite, XML validation, and release checks.

The integration matrix installs the release ZIP into **Maho 26.9.1** (commit `bbc0a6158a902fe03324377a7f142c45c38f2f59`) on PHP 8.3, 8.4, and 8.5 with MariaDB 10.11. Each job uses Maho's Composer bootstrap, `./maho install`, `./maho migrate`, and a PHP development server with the `public/` document root (the same document root used by `./maho serve`).

Native tests cover setup policies, admin field rendering and saves, all three configuration scopes, inheritance, HTTPS enforcement, invalid settings, query-string privacy, and the wait cap. Playwright then opens the actual Maho storefront and admin. It verifies disabled mode, immediate beacons on home and cart pages, consent before downloads, repeated opt-in, withdrawal and reload, delivered JavaScript assets, Maho beacon tags, and the admin consent helper. The collector is intercepted locally; Maho serves the pages and JavaScript. Magento CE and OpenMage are no longer test platforms for this repository.

For a local run, install the Node dependencies and Chromium, provide a disposable Maho 26.9.1 checkout and an empty MariaDB database, then run:

```bash
npm ci
npx playwright install --with-deps chromium
bash tests/platform/run.sh maho /path/to/maho
```

The default database is `basicrum` at `127.0.0.1` with username and password `basicrum`; override it with `BASICRUM_TEST_DB_HOST`, `BASICRUM_TEST_DB_NAME`, `BASICRUM_TEST_DB_USER`, and `BASICRUM_TEST_DB_PASSWORD`. The runner deploys the extension and installs the application, so use a checkout and database containing no data you need to preserve. Set `BASICRUM_TEST_BROWSER=0` only to run native PHP/HTTP checks without Chromium.

To rerun a browser scenario against the already configured running store, use `BASICRUM_TEST_MODE=disabled|immediate|consent npm run test:e2e` with the single mode matching the store configuration. `BASICRUM_TEST_BASE_URL` can override the browser's default `http://127.0.0.1:8080` URL.

Set `BASICRUM_TEST_RELEASE_ZIP=/absolute/path/to/basicrum-mahocommerce-1.1.0.zip`
to exercise a packaged installation locally. Keep its `.sha256` alongside it.
The runner verifies every archive entry against the checkout before deploying;
an invalid archive fails without falling back to source files.

## Release artifacts

The release process follows the WordPress plugin's package-and-smoke-test
approach, adapted to Maho's `app/` and `public/js/` layout and PHP compatibility matrix.

- Ordinary branch and pull-request CI uploads a candidate ZIP and SHA-256 file
  as the `basicrum-mahocommerce-release` Actions artifact, retained for 14 days.
  These are test candidates; check the entire workflow result before using them.
- Pushing a version tag such as `v1.1.0` triggers **Release Extension**, which
  calls the same CI workflow. Only after all PHP, browser, packaging, and Maho integration checks pass does it create a GitHub Release with generated notes
  and attach `basicrum-mahocommerce-1.1.0.zip` and its `.sha256` file.
- Tags such as `v1.1.0-alpha.1`, `v1.1.0-beta.1`, and `v1.1.0-rc.1` follow the
  same gates and are marked as prereleases, not latest stable releases.
  Their base version must match the module version; the suffix does not alter
  Maho's setup version. Unsupported suffixes and mismatched versions fail.
- Creating or editing a release in the GitHub UI is not a separate trigger.
  Use a tag push. A literal `/release` is not the release-tag convention.
- The published ZIP is the exact artifact installed by every Maho platform job;
  the publishing job verifies it again and never rebuilds it. Only that job
  receives `contents: write`; test jobs remain read-only. Newly added actions
  are pinned to full commit SHAs.

Before tagging, keep the module version in `app/code/local/BasicRum/Analytics/etc/config.xml`,
the **Version** section below, `package.json`, and both root versions in
`package-lock.json` synchronized. Commit and push the reviewed release changes,
then push the version tag. Do not move a published tag to another commit.
The workflow files must already be present in the tagged commit. No tag or
release is created by the local build commands.

Build and verify locally:

```bash
node --test tests/release/version.test.js
bash tests/release/package.sh
bash tests/check-package.sh
BASICRUM_RELEASE_TAG=v1.1.0 bash tools/build-release.sh
bash tools/verify-release.sh release/basicrum-mahocommerce-1.1.0.zip
(cd release && shasum -a 256 -c basicrum-mahocommerce-1.1.0.zip.sha256)
```

`tools/build-release.sh` optionally accepts an output directory. It refuses to
overwrite an existing version's ZIP/checksum; use a fresh directory for a new
build. The default `release/` directory is ignored by Git. The package includes
only the Modman-listed runtime files, `modman`, `composer.json`, README, license, and provenance
notice. Tests, CI files, Node dependencies/manifests, and local configuration
are excluded. Changes to the package boundary must keep Modman and the archive
layout aligned.

## Bundled Boomerang provenance

The bundled `public/js/basicrum/boomerangs/boomerang-1.815.60.cutting-edge.min.js` is byte-identical to the WordPress bundle and has SHA-256:

```text
90e8a1c85949b10d43e441efc3f0545f95e4384e26ee3042344a8b2b4110589c
```

It was built from commit `ead2783a33a2ce91205fe34f8fc992433faba9a2` in the [Basicrum Boomerang fork](https://github.com/basicrum/boomerang), based on [Akamai Boomerang](https://github.com/akamai/boomerang). The embedded banner identifies parent commit `564759ed70de7801bb64de5e2025fb6ac049ff5f` because the final source change was uncommitted when that artifact was generated. Reproducible-build and fork-change details are in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).

## License

Basicrum-owned code is licensed under the GNU General Public License version 2 or later; see [LICENSE.md](LICENSE.md). Bundled Boomerang retains its BSD license in [public/js/basicrum/LICENSE.txt](public/js/basicrum/LICENSE.txt).

## Version

1.1.0
