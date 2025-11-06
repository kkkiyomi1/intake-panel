# 进食监督面板（云同步 + 周视图 + 只读分享）

一个移动端友好、可互动的面板，支持：
- **两餐前/后汇报**、内容与时间填写
- **Commander 复核**（可选）
- 自动判定**当日完成**、**连续天数**、**每 N 天触发重大奖励**、**未完成记惩罚待执行**
- **周视图（打卡墙）** 与 **月视图** 切换
- **云同步（Firebase Firestore + 匿名登录）**，多人协作（Commander / Participant）
- **只读链接 / 打印模式**（`?mode=readonly`）
- **本地存储** 作为离线与简易模式

> 本项目保持“奖励/惩罚”为**中性字段**，不包含任何露骨内容。你可在界面设置中自定义标签名。

---

## 快速开始（本地）
```bash
npm install
npm run dev
```
打开终端提示地址（通常 http://localhost:5173）。

---

## 云同步（Firebase）配置

### 1. 创建 Firebase 项目
- 前往 https://console.firebase.google.com 新建项目
- 启用 **Authentication → Sign-in method → Anonymous（匿名登录）**
- 启用 **Firestore Database → Start in production mode**（生产模式）

### 2. 添加 Web 应用并记录配置
- 在项目设置里添加 Web App，得到配置：
  - apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId

### 3. 填写环境变量
在项目根目录创建 `.env` 文件（或在 Vercel/Netlify 上配置环境变量）：
```
VITE_FIREBASE_API_KEY=xxxxxxxx
VITE_FIREBASE_AUTH_DOMAIN=xxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxxx
VITE_FIREBASE_STORAGE_BUCKET=xxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxxx
VITE_FIREBASE_APP_ID=1:xxx:web:xxxx
```

### 4. Firestore 规则（复制到控制台 Rules 里保存发布）
该规则允许：
- 只有**房间成员**可读写本房间数据；
- **Participant** 只能写“餐次相关/原因”等字段；
- **Commander** 才能写“复核、奖励发放、惩罚执行”等字段；
- 允许通过**加入码**加入为 Participant。

```
// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthed() { return request.auth != null; }
    function isMember(roomId) {
      return exists(/databases/$(database)/documents/rooms/$(roomId)/members/$(request.auth.uid));
    }
    function getRole(roomId) {
      return get(/databases/$(database)/documents/rooms/$(roomId)/members/$(request.auth.uid)).data.role;
    }

    match /rooms/{roomId} {
      allow read: if isAuthed() && isMember(roomId);
      allow create: if isAuthed();
      allow update: if false; // 房间元数据仅由创建者通过后台维护，简化权限

      // 成员表：加入房间
      match /members/{uid} {
        allow read: if isAuthed() && isMember(roomId);
        // 创建成员（participant）：需要房间开放加入且加入码正确
        allow create: if isAuthed() && request.auth.uid == uid
          && get(/databases/$(database)/documents/rooms/$(roomId)).data.openJoin == true
          && request.resource.data.role == 'participant'
          && request.resource.data.uid == request.auth.uid
          && request.resource.data.joinCode == get(/databases/$(database)/documents/rooms/$(roomId)).data.joinCode
          && request.resource.data.keys().hasOnly(['uid','role','createdAt','joinCode']);
        // 更新/删除成员：禁止（如需可自行扩展）
        allow update, delete: if false;
      }

      // 记录表
      match /records/{date} {
        allow read: if isAuthed() && isMember(roomId);
        allow create, update: if isAuthed() && isMember(roomId)
          && (
            // Commander 可写所有字段
            (getRole(roomId) == 'commander')
            ||
            // Participant 只能写餐次/原因/日期等字段，不能写 commander 专属字段
            (getRole(roomId) == 'participant'
              && request.resource.data.diff(resource.data).changedKeys().hasOnly([
                  'date','meal1','meal2','reason','updatedAt','updatedByUid','updatedByRole'
              ])
            )
          );
        allow delete: if false;
      }
    }
  }
}
```

> 说明：加入成员时，前端会在 `members/{uid}` 的 `create` 请求体里临时携带 `joinCode`，用来和房间里的 `joinCode` 校验；规则限制了可写入的键，但为了避免保存加入码，你可以让前端创建后立刻再 `update` 覆盖掉该字段（本示例前端未保存 joinCode 字段到 members 文档）。

---

## 使用指南

### 角色与加入
- **创建房间（Commander）**：点“创建房间”，系统生成 `房间ID + 加入码`；把这两项发给她即可加入；你自动成为 **Commander**。  
- **参与者加入（Participant）**：她在“加入房间（参与者）”中输入 `房间ID + 加入码` 即可。  
- **只读分享**：在顶部点击“只读/打印”，复制带 `?mode=readonly` 的链接。

### 权限划分（前端与规则双层控制）
- **Participant**：仅能勾选餐前/餐后、填写时间与内容、填写未完成原因。  
- **Commander**：还能复核、标记奖励发放/惩罚执行、调整设置。  
- **Visitor**：未加入房间人员为访客，只读。

### 周视图 / 打卡墙
- 顶部“周视图”开关即可切换；周卡里提供 4 个微开关（餐1前/后、餐2前/后），适合手机端快速打卡。

### 只读分享 / 打印
- 点击“只读/打印”生成链接，打开后界面自动隐藏控制按钮；直接 `Ctrl/Cmd + P` 打印或保存 PDF。

### 本地模式（无云）
- 关闭“云同步”后，数据自动保存到浏览器 `localStorage`（按月份区分）。

---

## 部署

### Vercel（推荐）/ Netlify
- **Build 命令**：`npm run build`
- **输出目录**：`dist`
- 环境变量：将 `.env` 中的 `VITE_FIREBASE_*` 配置到平台环境变量中。

---

## 开发提示
- 可修改 `src/App.tsx` 自定义字段标签（保持中性描述即可）  
- 若需要 **PWA（离线 + 主屏）**，建议加 `vite-plugin-pwa`（本仓库留给你按需开启）  
- 若希望更严格的身份：可以把 Anonymous 改为 Email/Magic Link 登录，并在 `members` 文档里绑定邮箱。

---

## 免责声明 / 健康提醒
- 本工具仅作习惯养成与记录；任何“奖励/惩罚”均应在双方自愿、健康与安全前提下进行，必要时咨询专业人士建议。
