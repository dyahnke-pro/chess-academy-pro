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

  /// Re-entrancy guard. `setCategory` / `setActive` post an
  /// `AVAudioSession.routeChangeNotification`; without this the route-change
  /// observer can call back into `configureAudioSession()` and recurse —
  /// the infinite reconfigure loop that spammed "Session activation failed"
  /// hundreds of times and froze the app at launch (David 2026-06-06).
  private var isConfiguringAudio = false

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    configureAudioSession()
    registerAudioObservers()
    return true
  }

  /// Configure the shared audio session so coach TTS + board sounds play,
  /// HONOR the silent switch, and leave the mic route free for the native
  /// speech recognizer to own.
  ///
  /// DEEP AUDIO REWORK (David 2026-07-26 — "mute if phone is on silent" AND
  /// "microphone not working"). BOTH problems traced to the old
  /// `.playAndRecord` config:
  ///   1. MUTE-ON-SILENT: `.playAndRecord` (like `.playback`) is designed to
  ///      IGNORE the ringer/silent switch — audio plays even on silent. There
  ///      is no way to honor silent while that category is active. `.ambient`
  ///      is the one playback-capable category that RESPECTS the silent switch,
  ///      so TTS + board sounds now mute when the phone is silenced.
  ///   2. MIC STARVATION: the old `.playAndRecord` + `.defaultToSpeaker`
  ///      pre-seized the record route and forced output to the speaker. When
  ///      the @capacitor-community/speech-recognition plugin then started its
  ///      OWN AVAudioEngine, it inherited that half-configured route and got no
  ///      live input — the recognizer started, heard nothing, and stopped in a
  ///      restart loop (2026-07-26 audit: mic-start-requested → mic-native-
  ///      stopped pending="" ×N, permissions all granted). With `.ambient` the
  ///      app no longer touches the record route; the plugin configures a clean
  ///      `.record` session itself when the user taps the mic, and gets a valid
  ///      input node. On stop the plugin deactivates with
  ///      .notifyOthersOnDeactivation, and our foreground / interruption-end /
  ///      route-change observers re-assert `.ambient` so silent-honor + TTS
  ///      return for the next turn (the self-heal from the 2026-06-04 fix).
  ///
  /// `.ambient` mixes with other apps' audio by definition (no .mixWithOthers
  /// needed) and never fails to activate on missing mic permission, so it also
  /// removes the old "activation failed kills all audio" fragility.
  private func configureAudioSession() {
    // Guard against re-entry from the route-change notification that our own
    // setCategory/setActive calls post (see isConfiguringAudio).
    if isConfiguringAudio { return }
    isConfiguringAudio = true
    defer { isConfiguringAudio = false }

    let session = AVAudioSession.sharedInstance()
    // Always (re-)assert .ambient on the lifecycle hooks so silent-honor + TTS
    // return after a mic turn (the plugin leaves the category on .record when it
    // stops). A route change during an active listen is rare, and the mic's own
    // auto-restart re-arms it — so we prefer guaranteeing TTS/silent-honor
    // recovery over protecting that edge.
    do {
      try session.setCategory(.ambient, mode: .default, options: [])
      try session.setActive(true, options: [])
    } catch {
      print("[AppDelegate] AVAudioSession .ambient failed: \(error.localizedDescription)")
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
    // ONLY re-assert on a genuine device (dis)connect (Bluetooth, headphones).
    // Our own setCategory/setActive post route changes with reason
    // .categoryChange / .override / .routeConfigurationChange — re-configuring
    // on those re-triggers this notification → infinite loop → "Session
    // activation failed" spam + a frozen main thread (David 2026-06-06). The
    // re-entrancy guard can't catch it because the notification is delivered
    // asynchronously, so we must filter by reason here.
    guard
      let info = note.userInfo,
      let raw = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
      let reason = AVAudioSession.RouteChangeReason(rawValue: raw)
    else { return }
    switch reason {
    case .newDeviceAvailable, .oldDeviceUnavailable:
      configureAudioSession()
    default:
      break
    }
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
