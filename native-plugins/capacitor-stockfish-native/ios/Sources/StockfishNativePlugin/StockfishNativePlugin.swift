import Foundation
import Capacitor
import StockfishEngineCore

/*
 * StockfishNative — runs Stockfish 14.1 natively (classical eval) and streams
 * its UCI output to JS via the `output` listener event. Replaces the asm.js
 * WKWebView engine on iOS; the web/Android app keeps the JS engine.
 *
 * JS API (see capacitor-stockfish-native definitions):
 *   start()            boot the engine
 *   cmd({ cmd })       send one UCI command line
 *   exit()             quit the engine
 *   addListener('output', ({ line }) => ...)   receive each UCI output line
 */
@objc(StockfishNativePlugin)
public class StockfishNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StockfishNativePlugin"
    public let jsName = "StockfishNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cmd", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "exit", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getMaxMemory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCPUArch", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getDistribution", returnType: CAPPluginReturnPromise),
    ]

    private var started = false

    // C function pointers can't capture context, so the engine calls this
    // free @convention(c) trampoline with the opaque plugin pointer we passed
    // to sf_start; it hops to the main thread and forwards to JS listeners.
    private static let outputTrampoline: sf_output_cb = { (linePtr, ctx) in
        guard let linePtr = linePtr, let ctx = ctx else { return }
        let line = String(cString: linePtr)
        let plugin = Unmanaged<StockfishNativePlugin>.fromOpaque(ctx).takeUnretainedValue()
        DispatchQueue.main.async {
            plugin.notifyListeners("output", data: ["line": line])
        }
    }

    override public func load() {
        // Stop searching when the app is backgrounded so a runaway search
        // doesn't burn CPU/battery while suspended.
        NotificationCenter.default.addObserver(
            forName: UIApplication.willResignActiveNotification,
            object: nil, queue: .main
        ) { [weak self] _ in
            if self?.started == true { sf_cmd("stop") }
        }
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc func start(_ call: CAPPluginCall) {
        if !started {
            let ctx = Unmanaged.passUnretained(self).toOpaque()
            sf_start(StockfishNativePlugin.outputTrampoline, ctx)
            started = true
        }
        call.resolve()
    }

    @objc func cmd(_ call: CAPPluginCall) {
        guard started else {
            call.reject("You must call start() before sending commands")
            return
        }
        guard let command = call.getString("cmd") else {
            call.reject("Must provide a cmd")
            return
        }
        sf_cmd(command)
        call.resolve()
    }

    @objc func exit(_ call: CAPPluginCall) {
        if started {
            sf_exit()
            started = false
        }
        call.resolve()
    }

    @objc func getMaxMemory(_ call: CAPPluginCall) {
        // Cap engine hash at ~1/16th of physical memory (in MB).
        let maxMb = (ProcessInfo().physicalMemory / 16) / (1024 * 1024)
        call.resolve(["value": maxMb])
    }

    @objc func getCPUArch(_ call: CAPPluginCall) {
        call.resolve(["value": "arm64"])
    }

    // Which channel this install came from, so analytics can tell a TestFlight
    // beta tester apart from a real App Store user. Apple promotes the SAME
    // binary from TestFlight to the App Store, so this MUST be a runtime check
    // — a compile-time flag would mislabel every user after release. The
    // receipt filename is the documented signal: TestFlight (and sandbox)
    // installs carry `sandboxReceipt`, App Store installs carry `receipt`.
    // A simulator / dev build has no receipt at all.
    @objc func getDistribution(_ call: CAPPluginCall) {
        let receiptName = Bundle.main.appStoreReceiptURL?.lastPathComponent ?? ""
        let channel: String
        if receiptName == "sandboxReceipt" {
            channel = "testflight"
        } else if receiptName.isEmpty {
            channel = "development"
        } else {
            channel = "appstore"
        }
        call.resolve(["channel": channel])
    }
}
