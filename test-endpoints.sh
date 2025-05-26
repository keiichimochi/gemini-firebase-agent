#!/bin/bash

# Firebase Functions エンドポイントテストスクリプト

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

# 設定ファイルの読み込み
if [ -f "local-ports.config" ]; then
    source local-ports.config
fi

# デフォルトポート設定
FUNCTIONS_PORT=${FUNCTIONS_PORT:-5555}
BASE_URL="http://localhost:$FUNCTIONS_PORT"

echo "🧪 Firebase Functions エンドポイントテスト"
echo "=================================================="
echo "ベースURL: $BASE_URL"
echo ""

# エンドポイントテスト関数
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo "テスト: $description"
    echo "URL: $BASE_URL/$endpoint"
    echo "Method: $method"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL/$endpoint" || echo "000")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL/$endpoint" || echo "000")
    fi
    
    # レスポンスとステータスコードを分離
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    echo "Status: $http_code"
    echo "Response: $body"
    
    if [ "$http_code" = "200" ]; then
        log_success "✅ テスト成功"
    elif [ "$http_code" = "000" ]; then
        log_error "❌ 接続エラー（エミュレーターが起動していない可能性があります）"
    else
        log_warning "⚠️  予期しないステータスコード: $http_code"
    fi
    
    echo "=================================================="
    echo ""
}

# エミュレーターの起動確認
log_info "エミュレーターの起動確認中..."
if curl -s "$BASE_URL" > /dev/null 2>&1; then
    log_success "エミュレーターが起動しています"
else
    log_error "エミュレーターが起動していません"
    echo "先に ./start-test-server.sh を実行してください"
    exit 1
fi

# 各エンドポイントのテスト
echo "エンドポイントテストを開始します..."
echo ""

# 1. getagentinfo エンドポイントテスト
test_endpoint "GET" "getagentinfo" "" "エージェント情報取得"

# 2. processagentrequest エンドポイントテスト
test_data='{
  "task": "データ分析",
  "description": "売上データの傾向を分析してください",
  "data": {
    "sales": [100, 150, 200, 180, 220]
  }
}'
test_endpoint "POST" "processagentrequest" "$test_data" "エージェントリクエスト処理"

# 3. chat エンドポイントテスト
chat_data='{
  "message": "こんにちは、テストメッセージです",
  "sessionId": "test-session-123"
}'
test_endpoint "POST" "chat" "$chat_data" "チャット機能"

echo "🎉 全てのテストが完了しました！"
echo ""
echo "💡 ヒント:"
echo "  - エラーが発生した場合は、エミュレーターのログを確認してください"
echo "  - 本番環境のテストは別途行ってください"
echo "  - 詳細なテストは Postman や curl で個別に実行できます" 