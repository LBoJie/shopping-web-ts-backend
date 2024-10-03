# 購物網站開發專案

## 部署網址
- [購物網站前端](https://shopping-web-frontend.onrender.com)
- [Swagger文件](https://shopping-web-backend.onrender.com/api-docs/)

## 使用技術
  - 使用 TypeScript、Express 和 Sequelize 搭配 MySQL 資料庫
  - 負責構建用戶、產品、訂單、活動等核心數據模型
  - 使用 Swagger 管理 API 文件與測試

- **用戶認證與權限管理**：
  - 通過 JWT 實現用戶認證與權限管理
  - 實現了會員與管理員的多角色系統，有效分配操作權限，增強系統安全性
  - 設計 JWT Token 刷新機制，確保用戶在長時間的會話中保持登入狀態，提升系統的整體安全性

## 雲端平台

- **AWS S3**：儲存和管理圖片，實現圖片的上傳、讀取與存取控制
- **AWS RDS**：使用 AWS RDS 雲端資料庫進行數據管理
- **部署**：將專案部署至 Render 平台
