# Gemini Firebase AI Agent

Firebase上で動作するGemini 2.0 Flashを使用したマスターエージェントシステムです。

## 機能

- マスターエージェントによるタスクの振り分け
- 子エージェントへのタスク委譲機能
- RESTful APIエンドポイント
- 会話履歴の管理

## セットアップ

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定
`.env.example`を`.env`にコピーして、必要な値を設定：
```bash
cp .env.example .env
```

### 3. Firebaseプロジェクトの設定
`.firebaserc`のプロジェクトIDを更新：
```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

### 4. Firebase Functionsの環境変数設定
```bash
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"
```

## 開発

### ローカルでの実行
```bash
npm run serve
```

### ビルド
```bash
npm run build
```

### デプロイ
```bash
npm run deploy
```

## APIエンドポイント

### POST /processAgentRequest
タスクをマスターエージェントに送信

リクエスト例：
```json
{
  "taskType": "data_analysis",
  "parameters": {
    "data": [1, 2, 3, 4, 5],
    "operation": "mean"
  }
}
```

### GET /getAgentInfo
エージェントの情報を取得

### POST /chat
チャット形式でエージェントと対話

リクエスト例：
```json
{
  "message": "データ分析について教えてください",
  "sessionId": "unique-session-id",
  "conversationHistory": []
}
```

## 子エージェントの追加

`MasterAgent.ts`の`initializeChildAgents`メソッドで新しい子エージェントを定義できます。