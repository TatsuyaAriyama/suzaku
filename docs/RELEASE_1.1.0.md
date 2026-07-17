# リリース 1.1.0 — グランス表示 & ウィジェット

- MARKETING_VERSION: **1.1.0** ／ CURRENT_PROJECT_VERSION(build): **2**
  （package.json と ios pbxproj は反映済み。**App Store Connect の現行版より高いこと**を必ず確認。
  もし 1.0.0 が未公開なら 1.0.0 のまま build だけ上げる運用でも可 — その場合は
  package.json / pbxproj を戻す）

## App Store「このバージョンの新機能」

### 日本語
```
・コンパクト表示：針と距離だけのミニマルな画面に切り替えられるようになりました。
・ホーム／ロック画面ウィジェット：目的地の方角と距離をひと目で確認できます。
・起動をさらに軽く、なめらかに改善しました。
```

### English
```
• Compact view: switch to a minimal screen showing just the needle and distance.
• Home & Lock Screen widgets: see your destination's direction and distance at a glance.
• Faster, lighter startup.
```

## 提出前チェックリスト

- [ ] `npm run build` → `npx cap sync ios`
- [ ] ウィジェット拡張を Xcode で組み込み（[WIDGET_SETUP.md](WIDGET_SETUP.md)）
      - App / Widget 両ターゲットに App Group `group.com.tatsuyaariyama.ake`
      - `PrivacyInfo.xcprivacy` を **両ターゲット**に追加（本体＝App/App/、拡張＝SuzakuWidget/）
      - Widget の Minimum Deployments = iOS 16.0
- [ ] バージョン/ビルド番号が Connect の現行版より高いことを確認
- [ ] 実機で確認：コンパスの実方向、グランス表示、ウィジェット（ホーム＋ロック画面）
- [ ] 権限文言（位置・モーション）が ja/en で表示されること
- [ ] スクリーンショット：新機能（グランス表示・ウィジェット）を反映するか検討（`store/`）
- [ ] Xcode: Product → Archive → Distribute → App Store Connect へアップロード
- [ ] App Store Connect：新バージョンを作成し「新機能」を貼付 → ビルド選択 → 審査提出

## この環境でできないこと（要あなたの操作）
アーカイブ・署名・アップロード・審査提出は Xcode / App Store Connect / Apple Developer 
アカウントが必要なため、この環境では実行できません。コード・設定・文言は提出直前まで
用意済みです。
