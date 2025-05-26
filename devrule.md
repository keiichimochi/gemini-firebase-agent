# Firebase Functions v1 → v2 移行規範

## 概要
Firebase Functions v1（1st Gen）からv2（2nd Gen）への移行時に従うべきコーディング規範とベストプラクティス

## 1. インポート文の変更

### ❌ v1 (旧)
```typescript
import * as functions from 'firebase-functions';
import * as functions from 'firebase-functions/v1';
```

### ✅ v2 (新)
```typescript
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
```

## 2. 関数定義の変更

### ❌ v1 (旧)
```typescript
export const myFunction = functions.https.onRequest(async (req, res) => {
  // 処理
});

export const myRegionFunction = functions.region('us-central1').https.onRequest(async (req, res) => {
  // 処理
});
```

### ✅ v2 (新)
```typescript
export const myfunction = onRequest(async (req, res) => {
  // 処理
});

// オプション付きの場合
export const myfunction = onRequest(
  { 
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60
  },
  async (req, res) => {
    // 処理
  }
);
```

## 3. 関数名の規則

### ❌ v1では許可されていた
```typescript
export const getAgentInfo = functions.https.onRequest(...);
export const processAgentRequest = functions.https.onRequest(...);
```

### ✅ v2では小文字推奨
```typescript
export const getagentinfo = onRequest(...);
export const processagentrequest = onRequest(...);
```

**理由**: Cloud Runサービス名は小文字で作成されるため、一貫性を保つ

## 4. 環境変数とシークレット管理

### ❌ v1 (旧) - functions.config()
```typescript
const API_KEY = functions.config().api?.key || process.env.API_KEY;
```

### ✅ v2 (新) - Firebase Secrets
```typescript
import { defineSecret } from 'firebase-functions/params';

const apiKeySecret = defineSecret('API_KEY');

export const myfunction = onRequest(
  { secrets: [apiKeySecret] },
  async (req, res) => {
    const apiKey = apiKeySecret.value();
    // 処理
  }
);
```

## 5. シークレット設定コマンド

```bash
# シークレットの設定
firebase functions:secrets:set API_KEY

# 環境変数との競合を避ける
# .envファイルから同名の変数を削除する
```

## 6. firebase.json設定

### ✅ v2対応設定
```json
{
  "functions": {
    "source": ".",
    "runtime": "nodejs20",
    "ignore": [
      "node_modules",
      ".git",
      "firebase-debug.log",
      "firebase-debug.*.log",
      "*.local"
    ]
  }
}
```

**注意**: `predeploy`でnpmエラーが発生する場合は削除し、手動ビルドを行う

## 7. ログ出力

### ❌ v1 (旧)
```typescript
console.log('メッセージ');
console.error('エラー');
```

### ✅ v2 (新)
```typescript
import * as logger from 'firebase-functions/logger';

logger.info('メッセージ');
logger.error('エラー');
logger.warn('警告');
```

## 8. エラーハンドリングパターン

### ✅ 推奨パターン
```typescript
export const myfunction = onRequest(
  { secrets: [apiKeySecret] },
  async (req, res) => {
    try {
      // CORS設定
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');

      // OPTIONSリクエストの処理
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }

      // メソッド検証
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // シークレット取得
      const apiKey = apiKeySecret.value();
      if (!apiKey) {
        res.status(503).json({ 
          error: 'Service unavailable. API key not configured.' 
        });
        return;
      }

      // メイン処理
      const result = await processRequest(req.body, apiKey);
      res.status(200).json(result);

    } catch (error) {
      logger.error('Function error:', error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  }
);
```

## 9. デプロイ手順

### ✅ 推奨デプロイフロー
```bash
# 1. ビルド
npm run build

# 2. ローカルテスト
npm run serve

# 3. デプロイ
firebase deploy --only functions

# 4. 動作確認
curl -X GET "https://us-central1-PROJECT_ID.cloudfunctions.net/FUNCTION_NAME"
```

## 10. よくある問題と解決策

### 問題1: Container Healthcheck failed
**原因**: v1とv2のコード混在、依存関係エラー
**解決**: 完全にv2形式に移行、正しいインポート文使用

### 問題2: Secret environment variable overlaps
**原因**: .envファイルとFirebase Secretsの競合
**解決**: .envから該当変数を削除

### 問題3: 403 Forbidden
**原因**: v2のデフォルトセキュリティ設定
**解決**: Firebase ConsoleでIAM権限設定

### 問題4: npm predeploy error
**原因**: Firebase CLIのnpm実行時のstdinエラー
**解決**: firebase.jsonからpredeployを削除、手動ビルド

## 11. パフォーマンス最適化

### ✅ v2での推奨設定
```typescript
export const myfunction = onRequest(
  {
    memory: '256MiB',           // メモリ使用量
    timeoutSeconds: 60,         // タイムアウト
    minInstances: 0,            // 最小インスタンス数
    maxInstances: 10,           // 最大インスタンス数
    concurrency: 80,            // 同時実行数
    region: 'us-central1'       // リージョン
  },
  async (req, res) => {
    // 処理
  }
);
```

## 12. セキュリティベストプラクティス

### ✅ 必須設定
1. **シークレット管理**: 機密情報はFirebase Secretsを使用
2. **CORS設定**: 適切なオリジン制限
3. **入力検証**: リクエストデータの検証
4. **エラーハンドリング**: 機密情報の漏洩防止
5. **ログ管理**: 適切なログレベル設定

## 13. 移行チェックリスト

- [ ] インポート文をv2形式に変更
- [ ] 関数定義をonRequest形式に変更
- [ ] 関数名を小文字に変更
- [ ] functions.config()をdefineSecretに変更
- [ ] Firebase Secretsを設定
- [ ] .envファイルから競合する変数を削除
- [ ] console.logをlogger使用に変更
- [ ] firebase.jsonを更新
- [ ] ローカルテストを実行
- [ ] デプロイテストを実行
- [ ] 本番動作確認

## 14. ローカル開発環境の整備

### ✅ ポート競合回避システム

#### 問題
- 複数のFirebaseプロジェクト同時開発時のポート競合
- デフォルトポート（5001）の使用による衝突
- 手動でのポート管理の煩雑さ

#### 解決策
**自動ポート管理スクリプトの作成**:

1. **`start-test-server.sh`** - メインの起動スクリプト
```bash
# 使用例
./start-test-server.sh

# カスタムポート指定
FUNCTIONS_PORT=6666 ./start-test-server.sh
```

2. **`local-ports.config`** - ポート設定ファイル
```bash
FUNCTIONS_PORT=5555
UI_PORT=4444
AUTH_PORT=9999
FIRESTORE_PORT=8888
```

3. **`test-endpoints.sh`** - 自動テストスクリプト
```bash
./test-endpoints.sh
```

#### 機能
- ✅ 既存Firebaseプロセス自動検出・停止
- ✅ ポート使用状況チェック
- ✅ 自動ビルド実行
- ✅ 設定ファイル自動バックアップ・復元
- ✅ カラフルなログ出力
- ✅ エンドポイント自動テスト

### ✅ 開発ワークフロー最適化

#### 標準的な開発フロー
```bash
# 1. 開発環境起動
./start-test-server.sh

# 2. 別ターミナルでテスト実行
./test-endpoints.sh

# 3. コード変更後の確認
npm run build
./test-endpoints.sh
```

#### ファイル構成
```
gemini-firebase-agent/
├── start-test-server.sh      # テストサーバー起動
├── test-endpoints.sh         # エンドポイントテスト
├── local-ports.config        # ポート設定
├── LOCAL_DEVELOPMENT.md      # 開発ガイド
├── firebase.json             # Firebase設定
└── src/                      # ソースコード
```

### ✅ トラブルシューティング自動化

#### 自動解決機能
1. **ポート競合**: 代替ポート自動使用
2. **プロセス競合**: 既存プロセス検出・停止
3. **ビルドエラー**: 自動ビルド実行
4. **設定復元**: 終了時の自動クリーンアップ

#### エラーハンドリング
```bash
# エラー時の自動対応
- ポート使用中 → 代替ポート使用
- ビルド失敗 → エラー詳細表示・終了
- 設定破損 → バックアップから自動復元
```

## 15. 参考リンク

- [Firebase Functions v2 公式ドキュメント](https://firebase.google.com/docs/functions/2nd-gen)
- [Firebase Secrets Manager](https://firebase.google.com/docs/functions/config-env)
- [Cloud Run 設定オプション](https://cloud.google.com/run/docs/configuring)
- [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) - ローカル開発ガイド

---

**更新日**: 2025-05-26  
**作成者**: Firebase Functions v1→v2移行プロジェクト  
**バージョン**: 1.1 - ローカル開発環境整備追加 