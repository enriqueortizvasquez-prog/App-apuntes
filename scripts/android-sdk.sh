#!/usr/bin/env bash
set -euo pipefail
sdk="${ANDROID_HOME:-${RUNNER_TEMP:-/tmp}/android-sdk}"
manager="$sdk/cmdline-tools/latest/bin/sdkmanager"
if [ ! -x "$manager" ]; then
  mkdir -p "$sdk/cmdline-tools"
  archive="${RUNNER_TEMP:-/tmp}/android-tools.zip"
  curl --fail --location --retry 2 'https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip' --output "$archive"
  unzip -q "$archive" -d "$sdk/cmdline-tools/download"
  mv "$sdk/cmdline-tools/download/cmdline-tools" "$sdk/cmdline-tools/latest"
  rm "$archive"
fi
# yes gets SIGPIPE when sdkmanager closes stdin; only sdkmanager's status matters.
set +o pipefail
yes | "$manager" --sdk_root="$sdk" --licenses >/dev/null
set -o pipefail
"$manager" --sdk_root="$sdk" 'platform-tools' 'platforms;android-35' 'build-tools;35.0.0' 'emulator' 'system-images;android-35;google_apis;x86_64'
echo "ANDROID_HOME=$sdk" >> "$GITHUB_ENV"
echo "ANDROID_SDK_ROOT=$sdk" >> "$GITHUB_ENV"
echo "$sdk/platform-tools" >> "$GITHUB_PATH"
echo "$sdk/emulator" >> "$GITHUB_PATH"
echo "$sdk/cmdline-tools/latest/bin" >> "$GITHUB_PATH"
