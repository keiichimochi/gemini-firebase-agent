#!/bin/bash

# Firebase Functions ローカルテストサーバー起動スクリプト
# ポート競合を避けるための設定付き

set -e

# カラー出力用の定数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ出力関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# デフォルトポート設定
DEFAULT_FUNCTIONS_PORT=5001
DEFAULT_UI_PORT=4000
DEFAULT_AUTH_PORT=9099
DEFAULT_FIRESTORE_PORT=8080

# 設定ファイルの読み込み
if [ -f "local-ports.config" ]; then
    log_info "local-ports.configから設定を読み込み中..."
    source local-ports.config
    log_success "設定ファイルを読み込みました"
fi

# カスタムポート設定（競合回避用）
FUNCTIONS_PORT=${FUNCTIONS_PORT:-5555}
UI_PORT=${UI_PORT:-4444}
AUTH_PORT=${AUTH_PORT:-9999}
FIRESTORE_PORT=${FIRESTORE_PORT:-8888}

echo "🚀 Firebase Functions ローカルテストサーバー起動スクリプト"
echo "=================================================="

# 現在のディレクトリ確認
if [ ! -f "firebase.json" ]; then
    log_error "firebase.jsonが見つかりません。Firebaseプロジェクトのルートディレクトリで実行してください。"
    exit 1
fi

# 既存のFirebaseプロセスをチェック
log_info "既存のFirebaseプロセスをチェック中..."
if pgrep -f "firebase.*emulators" > /dev/null; then
    log_warning "既存のFirebaseエミュレーターが動作中です"
    echo "既存のプロセスを停止しますか？ (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        log_info "既存のFirebaseプロセスを停止中..."
        pkill -f "firebase.*emulators" || true
        sleep 2
        log_success "既存のプロセスを停止しました"
    else
        log_info "既存のプロセスを維持します"
    fi
fi

# ポート使用状況チェック
log_info "ポート使用状況をチェック中..."
check_port() {
    local port=$1
    local service=$2
    if lsof -i :$port > /dev/null 2>&1; then
        log_warning "ポート $port ($service) は使用中です"
        return 1
    else
        log_success "ポート $port ($service) は利用可能です"
        return 0
    fi
}

# 各ポートをチェック
check_port $FUNCTIONS_PORT "Functions"
check_port $UI_PORT "UI"
check_port $AUTH_PORT "Auth"
check_port $FIRESTORE_PORT "Firestore"

# .envファイルの存在確認
if [ ! -f ".env" ]; then
    log_warning ".envファイルが見つかりません"
    log_info ".envファイルを作成しますか？ (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        cat > .env << EOF
# Firebase Functions ローカル開発用環境変数
NODE_ENV=development
PROJECT_ID=gemini-firebase-agent
# GEMINI_API_KEY は Firebase Secrets で管理
EOF
        log_success ".envファイルを作成しました"
    fi
fi

# TypeScriptビルド
log_info "TypeScriptビルドを実行中..."
if npm run build; then
    log_success "ビルドが完了しました"
else
    log_error "ビルドに失敗しました"
    exit 1
fi

# Firebase設定ファイルの一時的な更新
log_info "Firebase設定を一時的に更新中..."
cp firebase.json firebase.json.backup

# エミュレーター設定を追加
cat > firebase.json << EOF
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
  },
  "emulators": {
    "functions": {
      "port": $FUNCTIONS_PORT
    },
    "ui": {
      "enabled": true,
      "port": $UI_PORT
    },
    "auth": {
      "port": $AUTH_PORT
    },
    "firestore": {
      "port": $FIRESTORE_PORT
    }
  }
}
EOF

# クリーンアップ関数
cleanup() {
    log_info "クリーンアップ中..."
    if [ -f "firebase.json.backup" ]; then
        mv firebase.json.backup firebase.json
        log_success "Firebase設定を復元しました"
    fi
}

# シグナルハンドラー設定
trap cleanup EXIT INT TERM

# エミュレーター起動
log_info "Firebaseエミュレーターを起動中..."
echo "使用ポート:"
echo "  - Functions: $FUNCTIONS_PORT"
echo "  - UI: $UI_PORT"
echo "  - Auth: $AUTH_PORT"
echo "  - Firestore: $FIRESTORE_PORT"
echo ""
echo "アクセスURL:"
echo "  - Functions: http://localhost:$FUNCTIONS_PORT"
echo "  - UI: http://localhost:$UI_PORT"
echo ""
echo "停止するには Ctrl+C を押してください"
echo "=================================================="

# エミュレーター起動（デバッグモード）
firebase emulators:start --only functions --debug

log_success "エミュレーターが正常に停止しました" 