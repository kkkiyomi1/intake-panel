# Intake Panel｜进食监督面板（云同步 + 周/月视图 + 奖惩规则）

一个为「两人协作监督」场景打造的饮食打卡工具。支持 **房间/角色**、**云端同步（Firestore）** 与 **本地离线**、**周/月视图切换**、**7 天奖惩统计**、**只读分享/打印**、**JSON 导入导出** 等。

- Tech stack：React + Vite + Tailwind + shadcn/ui + framer-motion + Firebase Auth/Firestore + Vercel  
- 角色：**Commander**（监督者） / **Participant**（参与者）  
- 适配：移动端 / 桌面端

---

## ✨ 主要特性

- **餐次打卡（两餐）**：勾选「进食前/后已汇报」，并填写 **时间** 与 **食物内容**  
  （本次更新：**参与者可编辑时间与食物内容**）。
- **Commander 复核（可选）**：是否需要复核可在设置中开关。
- **完成判定**：当日两餐均完成“前/后汇报”，且（若开启）已复核，则记为**完成**。
- **7 天奖惩机制**（页面内有可视化与规则说明）  
  自首次记录之日起，每 **连续 7 天** 为一个统计段：  
  - **该段 7 天全部完成** → 计 **1 次重大奖励**（待发放）；  
  - **该段的未完成天数** → 计入 **惩罚待执行** 次数。  
  Commander 可在每日卡片上 **发放奖励 / 执行惩罚** 并记录。
- **周视图 / 月视图**：周视图提供 4 个微开关（餐1前/后、餐2前/后），月视图展示完整表单。
- **云同步 / 本地离线**：可随时切换。云端用 Firestore；本地按「年-月」分区存储。
- **分享与打印**：可分享可编辑链接或 **只读/打印** 链接（`?mode=readonly`）。
- **JSON 导入/导出**：一键备份/迁移当月数据。

> **中性设计**：奖惩仅为字段名称，默认文案不含任何露骨内容；你可在设置中自定义标签。

---

## 📱 添加到主屏/桌面（PWA）

1. 打开网页后，顶部工具栏会出现 **「添加到主屏」** 按钮；如果浏览器已准备好安装，会高亮可点击。
2. 如果按钮呈灰色，可按以下方式手动调用浏览器的安装入口：
   - **iPhone / iPad（Safari）**：点击底部「分享」→ 选择 **添加到主屏幕**。
   - **Android（Chrome / Edge）**：点击右上角菜单 ⋮ → **添加到主屏幕 / 安装应用**。
   - **桌面 Chrome / Edge**：地址栏右端「安装」图标，或菜单 → **安装应用**。
3. 安装后图标会出现在桌面/主屏，打开即为全屏独立窗口；当有新版本发布时，页面顶部会出现“立即更新”提醒，一键刷新即可切换到最新。

> 网页版和安装版共用同一份数据，本地离线模式也可正常工作；如需云同步，请提前在环境中配置 Firebase。

---

## 🧑‍🤝‍🧑 角色与权限

| 区域 / 字段                               | Participant（参与者） | Commander |
|------------------------------------------|------------------------|-----------|
| 勾选餐前/餐后 `preReported/postReported` | ✅ 可写                 | ✅ 可写    |
| 时间 `preTime/postTime`、内容 `note`     | ✅ 可写                 | ✅ 可写    |
| 未完成原因 `reason`                       | ✅ 可写                 | ✅ 可写    |
| 复核 `commanderReviewed`                  | 🚫                     | ✅ 可写    |
| 奖励已发放 `rewardGranted`                | 🚫                     | ✅ 可写    |
| 惩罚已执行 `consequenceExecuted`         | 🚫                     | ✅ 可写    |
| 读记录                                   | ✅（房间成员）          | ✅         |

---

## ⚙️ 本地开发

```bash
npm install
npm run dev
```
浏览器打开终端提示地址（通常 http://localhost:5173）。

---

## 🔐 Firebase（云同步）配置

1. **创建 Firebase 项目**  
   - 启用 **Authentication → Sign-in method → Anonymous（匿名登录）**  
   - 启用 **Cloud Firestore**（Production mode）

2. **创建 Web App**，记录以下配置项：  
   `apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId`

3. **环境变量**（Vite 使用 `VITE_` 前缀）  
   在项目根目录创建 `.env.local`（或在 Vercel 项目环境变量中配置）：
   ```env
   VITE_FIREBASE_API_KEY=xxxxxxxx
   VITE_FIREBASE_AUTH_DOMAIN=xxxx.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=xxxx
   VITE_FIREBASE_STORAGE_BUCKET=xxxx.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=xxxx
   VITE_FIREBASE_APP_ID=1:xxx:web:xxxx
   ```

4. **Authorized domains**（非常重要）  
   在 Firebase Auth 的 **Authorized domains** 添加：  
   - `localhost`  
   - `<your-vercel-project>.vercel.app`  
   - 如有自定义域名，也需加入

---

## 🔒 Firestore 规则（复制到控制台 Rules 并发布）

与当前实现匹配：**成员可读；参与者只能改餐食/时间/内容/原因；Commander 还能改复核与奖惩；仅 Commander 可改房间元数据**。

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function authed() { return request.auth != null; }

    function isMember(roomId) {
      return authed() &&
        exists(/databases/$(database)/documents/rooms/$(roomId)/members/$(request.auth.uid));
    }

    function isCommander(roomId) {
      return authed() &&
        get(/databases/$(database)/documents/rooms/$(roomId)/members/$(request.auth.uid)).data.role == "commander";
    }

    // 参与者允许变更的字段
    function participantKeysOK() {
      let allowed = ["date","meal1","meal2","reason","updatedAt","updatedByUid","updatedByRole"];
      let d = request.resource.data.diff(resource.data);
      return d.affectedKeys().hasOnly(allowed);
    }

    // 指挥官允许变更的字段
    function commanderKeysOK() {
      let allowed = [
        "date","meal1","meal2","reason",
        "commanderReviewed","rewardGranted","consequenceExecuted",
        "updatedAt","updatedByUid","updatedByRole"
      ];
      let d = request.resource.data.diff(resource.data);
      return d.affectedKeys().hasOnly(allowed);
    }

    // 房间元数据（含 joinCode）
    match /rooms/{roomId} {
      allow read: if true;
      allow write: if isCommander(roomId);
    }

    // 成员子集合：自己或 Commander 可写
    match /rooms/{roomId}/members/{uid} {
      allow read:  if authed() && (request.auth.uid == uid || isCommander(roomId));
      allow write: if authed() && (request.auth.uid == uid || isCommander(roomId));
    }

    // 进食记录
    match /rooms/{roomId}/records/{dateKey} {
      allow read: if isMember(roomId);

      allow create, update: if isMember(roomId)
        && request.resource.data.date == dateKey
        && (
             (isCommander(roomId) && commanderKeysOK()) ||
             (!isCommander(roomId) && participantKeysOK())
           );

      allow delete: if isCommander(roomId);
    }
  }
}
```

> 如果你把「加入码」校验放在前端（`joinAsParticipant` 内已经校验），规则无需关心加入码；若要挪到规则层，可扩展 `/rooms/{roomId}/members` 的 `create` 校验逻辑。

---

## 🚀 部署到 Vercel

1. 将 GitHub 仓库 **Import** 到 Vercel
2. 在 Vercel **Settings → Environment Variables** 配置与 `.env.local` 相同的 `VITE_FIREBASE_*`
3. 一键 **Deploy**
4. 把 Vercel 生成的域名加入 Firebase **Authorized domains**

---

## 🧭 从零获取「包含所有改动」的完整项目

> 如果你当前机器上只有**旧版本**的代码，可以按以下任意一种方式获取最新内容。

### ✅ 推荐：使用 Git 同步最新分支

1. **打开终端并进入项目目录**（有旧版本的地方）。
2. 运行 `git status`，确保没有未提交的本地改动。如果有，请先 `git add` / `git commit` 或 `git stash` 暂存。
3. 执行以下指令把远程仓库里的最新提交抓取下来：
   ```bash
   git fetch origin
   ```
4. 切换到需要的分支（例如之前协作时创建的 `work` 分支）：
   ```bash
   git checkout work    # 如果远程只有 main，这里改成 main
   ```
5. 获取该分支的最新代码：
   ```bash
   git pull origin work
   ```
   > 如果提示「分支不存在」，说明远程没有同名分支，请改为 `git pull origin main` 或实际的目标分支名。
6.（可选）确认现在的提交就是我们讨论过的那一个：
   ```bash
   git log --oneline -5
   ```
7. 安装依赖并重新启动开发服务器：
   ```bash
   npm install
   npm run dev
   ```
   浏览器访问终端提示的地址（通常是 http://localhost:5173），即可看到包含所有修复的新界面。

### 📦 备选：重新克隆完整仓库

如果本地没有配置 Git，或想保留旧版本，可以用 **全新目录** 重新下载：

1. 打开终端，进入你想存放项目的父目录。
2. 使用仓库地址执行：
   ```bash
   git clone https://github.com/<你的用户名>/<仓库名>.git intake-panel-latest
   cd intake-panel-latest
   ```
   （把 `<你的用户名>/<仓库名>` 换成真实地址。）
3. 如需特定分支，执行 `git checkout work`（或其它分支名）。
4. 依次运行 `npm install`、`npm run dev` 验证本地环境。

### 📁 无法使用 Git？可以下载 ZIP

在 GitHub 仓库页面，点击绿色的 **Code** 按钮 → **Download ZIP**。解压后用 VS Code 打开，运行 `npm install`、`npm run dev` 即可。本方式不会跟踪历史，但能快速拿到完整的最新代码。

---

## 🔄 如何合并 GitHub 上的改动

如果你已经在 GitHub 上看到了这个分支的 Pull Request（PR），可以按下面的方式把改动合并进主分支：

### 如果没有看到现成的 PR
1. 确认代码已经推送到了 GitHub：在本地运行 `git status`，确认工作区干净后执行 `git push origin <你的分支名>`。
2. 打开仓库页面顶部的 **Pull requests** 标签页，点击右侧的绿色按钮 **New pull request**。
3. 在 Compare 页面中，确保 **base** 选择要合入的主分支（例如 `main`），**compare** 选择你刚推送的工作分支（例如 `work`）。
4. GitHub 会显示两个分支之间的差异。如果没有冲突并且改动正确，点击 **Create pull request** 填写标题和说明，再次点击 **Create pull request**。
5. 现在该 PR 会出现在列表中，你可以继续按照下面的方法（网页或命令行）完成合并。

### 方法一：通过网页界面合并
1. 打开仓库的 **Pull requests** 页面，点击对应的 PR。
2. 检查 PR 的 **Files changed**、**Checks**、**Preview** 等信息，确保改动符合预期。
3. 点击绿色的 **Merge pull request** 按钮，再点 **Confirm merge**。
4. （可选）如果仓库开启了自动部署流程，GitHub Actions/Vercel 会在合并后自动触发；稍等几分钟查看部署状态即可。

### 方法二：通过命令行合并
1. 在本地终端拉取远程分支：
   ```bash
   git fetch origin
   ```
2. 切换到需要合并的目标分支（通常是 `main` 或 `master`）：
   ```bash
   git checkout main
   git pull origin main
   ```
3. 把 PR 所在的分支合并进来（假设分支名叫 `work`）：
   ```bash
   git merge origin/work
   ```
4. 合并成功后推送到远程：
   ```bash
   git push origin main
   ```
5. 推送完成后，GitHub 的自动部署流程（若已配置）会根据新提交自动执行。

> 如果合并时出现冲突，Git 会提示需要手动解决。按照提示编辑冲突文件、`git add` 解决后的文件，再执行 `git merge --continue` 完成合并即可。
5. 打开站点 → 顶部切换 **云同步** 为「已开启」

---

## 📘 使用流程

- **Commander（监督者）**
  1) 开云同步 → **创建房间**（生成 `房间ID + 加入码`）  
  2) 把 `房间ID + 加入码` 发给参与者  
  3) 在每日卡片上进行 **复核/发放奖励/执行惩罚** 的记录

- **Participant（参与者）**
  1) **加入房间（参与者）** → 输入 `房间ID + 加入码`  
  2) 勾选 **餐前/餐后**，填写 **时间/食物内容**，必要时填写 **未完成原因**

- **只读/打印**  
  顶部「只读/打印」按钮生成只读链接（带 `?mode=readonly`），可直接打印或导出 PDF。

---

## 🧪 数据模型（节选）

```ts
type MealEntry = {
  preReported: boolean;
  postReported: boolean;
  preTime?: string;
  postTime?: string;
  note?: string; // 食物内容
};

type DayRecord = {
  date: string; // YYYY-MM-DD（作为文档ID）
  meal1?: MealEntry;
  meal2?: MealEntry;
  reason?: string;
  commanderReviewed?: boolean;
  rewardGranted?: boolean;
  consequenceExecuted?: boolean;
  updatedAt?: number;
  updatedByUid?: string;
  updatedByRole?: "participant" | "commander";
};
```

---

## 🛠️ 常见问题

- **线上无法编辑，但本地可以？**  
  1) 确认 Firestore 规则已发布为上文版本；  
  2) 确认站点域名已加入 Firebase **Authorized domains**；  
  3) 刷新页面；确认顶部 **云同步** 已开启；  
  4) 确认自己已成为该房间 **members**（`rooms/{roomId}/members/{uid}`）。

- **参与者仍不能填时间或食物？**  
  升级到本次版本后已开放；若仍不行，请检查 **Firestore 规则** 与 **前端代码** 是否均已更新并重新部署。

- **没有登录弹窗？**  
  本应用使用 **匿名登录** 自动完成，无需弹窗。域名白名单正确即可。

---

## 📜 许可证

MIT

---

### 更新摘要
- ✅ 参与者可编辑「时间」与「食物内容」  
- ✅ 内置 **7 天奖惩统计**，并在页面写清楚规则  
- ✅ Firestore 规则与前端权限对齐（参与者/Commander 字段级写入限制）
