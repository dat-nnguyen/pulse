import UIKit
import Capacitor
import AVFoundation

// Relay native interruptions to the shared player so its EQ recovery watchdog
// does not try to reopen audio during a phone call or Siri session.
class PulseViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        NotificationCenter.default.addObserver(self, selector: #selector(audioInterrupted(_:)),
            name: AVAudioSession.interruptionNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(audioRouteChanged(_:)),
            name: AVAudioSession.routeChangeNotification, object: nil)
    }

    deinit { NotificationCenter.default.removeObserver(self) }

    private func sendAudioEvent(_ detail: String) {
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('pulseAudioSession', { detail: \(detail) }));", completionHandler: nil)
        }
    }

    @objc private func audioInterrupted(_ notification: Notification) {
        guard let raw = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
        if type == .began {
            sendAudioEvent("{ type: 'interruptionBegan' }")
        } else {
            let options = AVAudioSession.InterruptionOptions(rawValue:
                notification.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0)
            var shouldResume = options.contains(.shouldResume)
            if shouldResume {
                do { try AVAudioSession.sharedInstance().setActive(true) }
                catch { shouldResume = false }
            }
            sendAudioEvent("{ type: 'interruptionEnded', shouldResume: \(shouldResume) }")
        }
    }

    @objc private func audioRouteChanged(_ notification: Notification) {
        guard let reason = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
              reason == AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue else { return }
        sendAudioEvent("{ type: 'headphonesDisconnected' }")
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = PulseViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
