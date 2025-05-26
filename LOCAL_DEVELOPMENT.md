# ローカル開発ガイド

## 概要
Firebase Functions v2を使用したGemini AIエージェントシステムのローカル開発環境セットアップとテスト方法

## 🚀 クイックスタート

### 1. テストサーバー起動
```bash
# ポート競合を自動回避してエミュレーター起動
./start-test-server.sh
```

### 2. エンドポイントテスト
```bash
# 別のターミナルで実行
./test-endpoints.sh
```

## 📋 詳細な使用方法

### テストサーバー起動スクリプト (`start-test-server.sh`)

#### 機能
- 既存のFirebaseプロセス検出・停止
- ポート競合チェック
- 自動ビルド実行
- カスタムポート設定
- 設定ファイル自動復元

#### 使用ポート（デフォルト）
- **Functions**: 5555 (標準: 5001)
- **UI**: 4444 (標準: 4000)
- **Auth**: 9999 (標準: 9099)
- **Firestore**: 8888 (標準: 8080)

#### アクセスURL
- Functions: http://localhost:5555
- UI: http://localhost:4444

### ポート設定カスタマイズ

#### 方法1: 環境変数
```bash
FUNCTIONS_PORT=6666 UI_PORT=5555 ./start-test-server.sh
```

#### 方法2: 設定ファイル編集
`local-ports.config`を編集:
```bash
FUNCTIONS_PORT=6666
UI_PORT=5555
AUTH_PORT=8888
FIRESTORE_PORT=7777
```

### エンドポイントテストスクリプト (`test-endpoints.sh`)

#### テスト対象
1. **GET /getagentinfo** - エージェント情報取得
2. **POST /processagentrequest** - タスク処理
3. **POST /chat** - チャット機能

#### 実行例
```bash
./test-endpoints.sh
```

#### 出力例
```
🧪 Firebase Functions エンドポイントテスト
==================================================
ベースURL: http://localhost:5555

テスト: エージェント情報取得
URL: http://localhost:5555/getagentinfo
Method: GET
Status: 200
Response: {"success":true,"agents":[...]}
✅ テスト成功
```

## 🔧 トラブルシューティング

### よくある問題

#### 1. ポート競合エラー
```
Error: Port 5001 is already in use
```
**解決策**: 
- `start-test-server.sh`が自動的に代替ポートを使用
- または`local-ports.config`でポートを変更

#### 2. エミュレーター起動失敗
```
Error: Failed to start emulator
```
**解決策**:
1. 既存プロセス確認: `ps aux | grep firebase`
2. プロセス停止: `pkill -f firebase`
3. 再起動: `./start-test-server.sh`

#### 3. ビルドエラー
```
Error: Build failed
```
**解決策**:
1. 依存関係確認: `npm install`
2. TypeScript確認: `npm run build`
3. 設定確認: `tsconfig.json`

#### 4. 接続エラー
```
❌ 接続エラー（エミュレーターが起動していない可能性があります）
```
**解決策**:
1. エミュレーター起動確認
2. ポート確認: `lsof -i :5555`
3. ファイアウォール設定確認

### デバッグ方法

#### 1. ログ確認
```bash
# エミュレーターログ
firebase emulators:start --only functions --debug

# 関数ログ
curl http://localhost:5555/getagentinfo
```

#### 2. 手動テスト
```bash
# GET リクエスト
curl -X GET http://localhost:5555/getagentinfo

# POST リクエスト
curl -X POST http://localhost:5555/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"テスト","sessionId":"test"}'
```

#### 3. ブラウザテスト
- UI: http://localhost:4444
- Functions: http://localhost:5555

## 📁 ファイル構成

```
gemini-firebase-agent/
├── start-test-server.sh      # テストサーバー起動スクリプト
├── test-endpoints.sh         # エンドポイントテストスクリプト
├── local-ports.config        # ポート設定ファイル
├── firebase.json             # Firebase設定
├── .env                      # 環境変数（本番用）
├── src/                      # ソースコード
│   ├── index.ts             # メイン関数
│   └── agents/              # エージェント実装
└── lib/                      # ビルド出力
```

## 🔄 開発ワークフロー

### 1. 開発開始
```bash
# 1. エミュレーター起動
./start-test-server.sh

# 2. 別ターミナルでテスト実行
./test-endpoints.sh
```

### 2. コード変更
```bash
# 1. ソースコード編集
vim src/index.ts

# 2. 自動リビルド（エミュレーター起動中は自動）
# または手動ビルド
npm run build
```

### 3. テスト
```bash
# エンドポイントテスト
./test-endpoints.sh

# 個別テスト
curl -X GET http://localhost:5555/getagentinfo
```

### 4. デプロイ準備
```bash
# 1. エミュレーター停止 (Ctrl+C)
# 2. 本番ビルド
npm run build
# 3. デプロイ
firebase deploy --only functions
```

## 🛡️ セキュリティ注意事項

### ローカル開発時
- `.env`ファイルにシークレットを含めない
- Firebase Secretsを使用
- ローカルポートは外部公開しない

### 本番デプロイ前
- 全テストパス確認
- セキュリティヘッダー確認
- CORS設定確認

## 📚 参考リンク

- [Firebase Functions v2 ドキュメント](https://firebase.google.com/docs/functions/2nd-gen)
- [Firebase エミュレーター](https://firebase.google.com/docs/emulator-suite)
- [devrule.md](./devrule.md) - v1→v2移行規範

---

**最終更新**: 2025-05-26  
**作成者**: Firebase Functions v1→v2移行プロジェクト 