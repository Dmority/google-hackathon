# Project Brief

## Project Overview

このプロジェクトは、Next.js を使用したリアルタイムチャットアプリケーションです。WebSocket を使用してリアルタイムコミュニケーションを実現し、Redis をメッセージストアとして活用しています。

## Core Requirements

### 機能要件

1. リアルタイムチャット

   - WebSocket によるリアルタイムメッセージング
   - メッセージの永続化（Redis）
   - メッセージの履歴表示

2. ルーム管理

   - ルームの作成と参加
   - ルームコードによるアクセス制御

3. エージェント機能
   - AI エージェントの作成と管理
   - メンション機能によるエージェントとの対話

### 技術要件

1. フロントエンド

   - Next.js (App Router)
   - TypeScript
   - Tailwind CSS

2. バックエンド

   - Next.js API Routes
   - WebSocket (Socket.IO)
   - Redis

3. インフラストラクチャ
   - Kubernetes
   - Terraform
   - Docker

## Project Goals

1. スケーラブルなリアルタイムチャットプラットフォームの構築
2. AI エージェントとの自然な対話体験の提供
3. 高パフォーマンスで信頼性の高いメッセージング基盤の実現

## Success Criteria

1. メッセージの遅延が最小限（500ms 以下）
2. 99.9%以上の可用性
3. スムーズなユーザー体験
4. AI エージェントの応答性能の最適化
