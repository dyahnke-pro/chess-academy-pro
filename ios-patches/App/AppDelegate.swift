//
//  AppDelegate.swift
//  App
//
//  Chess Academy Pro — iOS native AppDelegate with AVAudioSession patch.
//
//  Copied over the Capacitor-generated AppDelegate by the `setup:ios`
//  npm script after every `npx cap sync ios`. The only substantive
//  change vs. Capacitor's default is the AVAudioSession category
//  configuration inside application(_:didFinishLaunchingWithOptions:).
//
//  Why the patch is required:
//    - Default Capacitor / WKWebView audio session category silences
//      Web Audio (Polly TTS) when a Bluetooth headset is connected OR
//      when the iPhone ringer switch is flipped on.
//    - Setting .playAndRecord + .allowBluetooth + .defaultToSpeaker
//      keeps coach narration audible in both cases without stealing
//      the output from other apps (via .mixWithOthers).
//    - Web Speech input also benefits from .playAndRecord since the
//      .playback-only default doesn't permit mic capture.
//
//  If this file drifts from Capacitor's default, bring forward the
//  upstream changes but PRESERVE the AVAudioSession setup call.
//

import UIKit
import Capacitor
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

  var window: UIWindow?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    configureAudioSession()
    return true
  }

  /// Configure the shared audio session so Polly TTS and Web Speech mic
  /// input work reliably with Bluetooth headsets and the silent-switch
  /// engaged. Called once on launch; iOS keeps the category active for
  /// the lifetime of the app unless another component reassigns it.
  private func configureAudioSession() {
    let session = AVAudioSession.sharedInstance()
    do {
      try session.setCategory(
        .playAndRecord,
        mode: .default,
        options: [.mixWithOthers, .allowBluetooth, .defaultToSpeaker]
      )
      try session.setActive(true, options: [])
    } catch {
      // Non-fatal: log to console and proceed. The app still boots;
      // voice features may degrade to Web Speech or silence under the
      // conditions the patch was designed to avoid. No user-facing
      // UI here — CoachGamePage surfaces Polly failures via its own
      // error path.
      print("[AppDelegate] AVAudioSession setup failed: \(error.localizedDescription)")
    }
  }

  func applicationWillResignActive(_ application: UIApplication) {}
  func applicationDidEnterBackground(_ application: UIApplication) {}
  func applicationWillEnterForeground(_ application: UIApplication) {}
  func applicationDidBecomeActive(_ application: UIApplication) {}
  func applicationWillTerminate(_ application: UIApplication) {}

  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
  }

  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
  }
}
