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
    registerAudioObservers()
    return true
  }

  /// Configure the shared audio session so Polly TTS, the board sound
  /// effects, and Web Speech mic input work reliably with Bluetooth
  /// headsets and the silent-switch engaged.
  ///
  /// ROOT FIX (David 2026-06-04: all native audio — board clicks AND coach
  /// voice — went silent mid-session while audio worked fine on the web/Vercel
  /// build). The session was configured ONLY on launch and the lifecycle
  /// hooks were empty, so the FIRST audio interruption (backgrounding, a
  /// notification, a phone call, Siri, a Bluetooth route change) deactivated
  /// the session and nothing ever re-activated it — every later sound (which
  /// plays through the WKWebView's Web Audio, gated by this session) was
  /// dropped until the app was force-quit and relaunched. We now re-activate
  /// on foreground + on interruption-end + on route change, so it self-heals.
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

  /// Observe audio interruptions + output-route changes so the session is
  /// re-activated after a call/Siri/notification or a Bluetooth (dis)connect.
  private func registerAudioObservers() {
    let nc = NotificationCenter.default
    nc.addObserver(
      self,
      selector: #selector(handleInterruption(_:)),
      name: AVAudioSession.interruptionNotification,
      object: nil
    )
    nc.addObserver(
      self,
      selector: #selector(handleRouteChange(_:)),
      name: AVAudioSession.routeChangeNotification,
      object: nil
    )
  }

  @objc private func handleInterruption(_ note: Notification) {
    guard
      let info = note.userInfo,
      let raw = info[AVAudioSessionInterruptionTypeKey] as? UInt,
      let type = AVAudioSession.InterruptionType(rawValue: raw)
    else { return }
    // On .ended, re-activate so audio resumes instead of staying dead.
    if type == .ended {
      configureAudioSession()
    }
  }

  @objc private func handleRouteChange(_ note: Notification) {
    // Bluetooth connect/disconnect, headphone plug/unplug — re-assert the
    // category + active state so output keeps flowing to the new route.
    configureAudioSession()
  }

  func applicationWillResignActive(_ application: UIApplication) {}
  func applicationDidEnterBackground(_ application: UIApplication) {}
  func applicationWillEnterForeground(_ application: UIApplication) {}
  /// Re-activate every time the app returns to the foreground — the most
  /// reliable recovery point after iOS deactivated the session in the
  /// background (the case that left David's audio dead until a relaunch).
  func applicationDidBecomeActive(_ application: UIApplication) {
    configureAudioSession()
  }
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
