source 'https://rubygems.org'

# Pin openssl away from the gem versions that throw
# "invalid curve name (OpenSSL::PKey::ECError)" when fastlane/spaceship
# parses the App Store Connect EC API key (token.rb's OpenSSL::PKey::EC.new).
# 3.2.0 / 3.2.1 / 3.3.0 are the broken releases; this is the exact constraint
# fastlane uses in its own Gemfile. Without it the macOS-15 runner resolves a
# bad openssl gem and every TestFlight build dies at the auth step.
gem 'openssl', '>= 3.1.2', '!= 3.2.0', '!= 3.2.1', '!= 3.3.0'

# Fastlane drives the iOS TestFlight build/upload from the macOS CI runner.
# Pinned loosely; CI runs `bundle install` against the macOS image's Ruby.
gem 'fastlane'
gem 'cocoapods'
