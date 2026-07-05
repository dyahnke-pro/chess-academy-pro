// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorStockfishNative",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapacitorStockfishNative",
            targets: ["StockfishNativePlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        // Vendored Stockfish 14.1 engine + the pure-C bridge. No Capacitor
        // dependency, so the Swift plugin can depend on it without a
        // Swift <-> C++ interop cycle. Built classical-only (NNUE off) so no
        // .nnue net file is needed.
        .target(
            name: "StockfishEngineCore",
            path: "ios/Sources/StockfishEngineCore",
            exclude: [
                "sf/Copying.txt",
                "sf/incbin/UNLICENCE"
            ],
            sources: [
                "StockfishEngineCore.mm",
                "sf"
            ],
            publicHeadersPath: "include",
            cxxSettings: [
                .define("NNUE_EMBEDDING_OFF"),
                .define("NDEBUG"),
                .define("USE_PTHREADS"),
                .define("IS_64BIT"),
                .define("USE_POPCNT"),
                .unsafeFlags([
                    "-std=c++17",
                    "-fno-exceptions",
                    "-fno-rtti",
                    "-O2"
                ])
            ]
        ),
        .target(
            name: "StockfishNativePlugin",
            dependencies: [
                "StockfishEngineCore",
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/StockfishNativePlugin")
    ],
    cxxLanguageStandard: .cxx17
)
