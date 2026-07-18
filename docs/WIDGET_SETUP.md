# ロック/ホーム画面ウィジェット — セットアップ状況

目的地の**方角**と**直線距離**をロック画面・ホーム画面のウィジェットに表示する。
リアルタイムのコンパスではなく、「最後に取得した現在地」を基準にした方角・距離を
定期的（＋アプリ起動中は変化のたびに即時）に更新する。

## 状況（2026-07-18 深夜時点）— ✅ Archive成功・アップロード待ちのみ

**Xcodeでの作業はもう不要です。** `xcodebuild archive` を実際に完走させ、
**`** ARCHIVE SUCCEEDED **`** を確認済みです。

```
~/Library/Developer/Xcode/Archives/2026-07-18/Suzaku 7-18-26, 1.1.0 (2).xcarchive
```

Xcodeを開けば **Window → Organizer** に自動的に表示されます。

### 残っている作業（あなたの操作で・数クリック）
1. Xcode を開く（`open ios/App/App.xcworkspace` でも、直接 Xcode.app からでもOK）
2. **Window → Organizer**（またはOrganizerが自動で開く）
3. 「Suzaku 7-18-26, 1.1.0 (2)」を選択 → **Distribute App**
4. **App Store Connect → Upload**
5. サインイン画面が出たら、あなたのApple IDでサインイン（Claudeはこの画面を経由していません）
6. アップロード完了後、[App Store Connect](https://appstoreconnect.apple.com) で新しいビルドが処理されるのを待ち（数分〜数十分）、新バージョンに紐付けて審査提出

これで提出まで完了します。

## 検証済み内容
- ✅ App: `com.tatsuyaariyama.ake`, version **1.1.0 (build 2)**
- ✅ `Apple Distribution: ariyama tatsuya (SZ343VGXTL)` で署名済み
- ✅ SuzakuWidget.appex（`com.tatsuyaariyama.ake.SuzakuWidget`）を正しく埋め込み・署名・検証済み
- ✅ Xcodeの `-validate-for-store` チェック通過
- ✅ 両方のプロファイルとも App Groups capability 付き、正しい App ID に紐付け済み

## 今夜の作業で分かったこと（今後のため）

### 署名設定
App / SuzakuWidget 両ターゲットの **Release構成は Manual Signing** に設定済み
（Debugは Automatic のまま）。プロファイル名を明示的に指定しているため、
今後 `xcodebuild archive` を実行する際もこの設定のまま安定して動きます。
プロファイルの有効期限は **2027年7月17日** — その前に更新が必要になったら、
developer.apple.com の Profiles ページで再生成してください（App Store
配布用プロファイルはデバイス登録不要で、この作業で得た知見の通りシンプルです）。

### CocoaPods 1.10.2特有の既知バグ（このマシン限定）
このマシンのシステムRubyが古く、CocoaPods 1.10.2という代替バージョンを
使わざるを得ませんでした。このバージョンには、Archiveビルド時にフレームワークの
相対シンボリックリンクを誤って解決するバグがあり、`[CP] Embed Pods Frameworks`
が失敗します。`Pods/Target Support Files/Pods-App/Pods-App-frameworks.sh` を
直接パッチして回避しましたが、この修正は `.gitignore` 対象の `Pods/` 配下にあるため
リポジトリには残っていません。**あなたの普段の開発環境（モダンなCocoaPods）では
そもそも発生しない問題**のはずです。もし同じエラーに遭遇したら:
`error: ...UninstalledProducts/iphoneos/Capacitor.framework: (l)stat: No such file`
→ `gem install cocoapods`（システムのデフォルト、モダンな版）で `pod install`
し直せば解決するはずです。

## 含まれるファイル（参考・すでに反映済み）

| ファイル | ターゲット | 役割 |
|---|---|---|
| `ios/App/App/SuzakuWidgetPlugin.swift` | App | JS→ネイティブのブリッジ |
| `ios/App/App/SuzakuWidgetPlugin.m` | App | Capacitorへのプラグイン登録 |
| `ios/App/App/App.entitlements` | App | App Group |
| `ios/App/SuzakuWidget/SuzakuWidgetBundle.swift` | SuzakuWidget | `@main` ウィジェットバンドル |
| `ios/App/SuzakuWidget/SuzakuWidget.swift` | SuzakuWidget | Provider＋各サイズの View |
| `ios/App/SuzakuWidget/WidgetSnapshot.swift` | SuzakuWidget | 共有モデル・距離/方位計算・整形 |
| `ios/App/SuzakuWidget/Info.plist` | SuzakuWidget | 拡張の Info.plist |
| `ios/App/SuzakuWidget/SuzakuWidget.entitlements` | SuzakuWidget | App Group |
| `ios/App/SuzakuWidget/PrivacyInfo.xcprivacy` | SuzakuWidget | プライバシーマニフェスト |

App Group ID は全体で **`group.com.tatsuyaariyama.ake`** に統一している。

## 動作の要点
- **データが出る条件**: アプリを一度起動し、目的地（と現在地）が取得済みであること。
  未設定なら「目的地を設定」を表示。
- **更新頻度**: アプリ起動中は目的地変更／約40m移動／30秒経過／現在地の有無が切り替わった
  瞬間に即時反映。バックグラウンド時は WidgetKit のタイムライン（約15分間隔＋iOS判断）で更新。
- **方角の意味**: 端末の向きは使えないため、**北を上に固定**した地図的な方位
  （矢印＋「北東」等）。歩く方向に追従するリアルタイム針はアプリ本体でのみ動く。
- **タップ**: ウィジェットをタップするとアプリが開く（`suzaku://compass`）。

## トラブルシュート
- ウィジェットが常に空/プレースホルダ → App Group ID が3箇所（App entitlements /
  Widget entitlements / コード内 `suiteName`）で一致しているか確認（変更していなければ一致済み）。
- Archive時にプロファイルエラーが再発する → プロファイルが期限切れ・削除された可能性。
  developer.apple.com の Profiles で作り直し、`PROVISIONING_PROFILE_SPECIFIER` の
  名前と一致していることを確認してから再度Archiveしてください。
