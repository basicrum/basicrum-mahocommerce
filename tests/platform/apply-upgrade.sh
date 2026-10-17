#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
    echo "Usage: $0 <platform> <platform-root>" >&2
    exit 2
fi

platform="$1"
platform_root="$(cd "$2" && pwd)"

case "$platform" in
    maho)
        ;;
    *)
        echo "Unsupported platform: $platform" >&2
        exit 2
        ;;
esac

(
    cd "$platform_root"
    php -d memory_limit=-1 maho migrate --no-interaction
    php maho cache:flush
)

echo "Applied pending ${platform} module upgrade through the Maho migration CLI."
