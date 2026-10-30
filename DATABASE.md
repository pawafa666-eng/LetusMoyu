# 云存档结构（v0.4）

使用现有 CloudBase NoSQL。下列五个集合均为 ADMINONLY，由事件云函数 letusMoyu 读写。浏览器只调用登录和函数，不直接读写数据库。

| 集合 | 文档 ID | 主要字段 |
|---|---|---|
| letus_moyu_rooms | 园区十位邀请码 | state（完整状态 JSON 字符串）、version、updatedAt |
| letus_moyu_members | 原生认证 UID | roomId、joinedAt |
| letus_moyu_receipts | SHA256(uid:requestId) | room、actor、payloadHash、action、createdAt、threadId |
| letus_moyu_snapshots | roomId-轮转槽号 | roomId、state、version、createdAt；十二个槽 |
| letus_moyu_correspondence | 会话 UUID | roomId、scopeCivil、scopeAir、kind、updatedAt、awaitingStaff、thread（JSON 字符串） |

## 园区状态

state.rulesVersion 为 4；玩家档案 archiveVersion 为 4。主要对象：

- players[uid].profile：显示名、固定学校“不急大学”、研究方向和自我介绍。
- portfolio.papers / patents：成果 UUID、题目、作者快照（ID、姓名、导师/学生/合作者角色）、期刊或虚拟专利号、发表时间、来源、状态。
- representatives：本玩家已发表论文 UUID，去重且至多五个。
- students[]：方向、学业进度、心情、头像种子、培养规划、论文/专利进度与数量、当前任务、任务历史和学术经历。
- inbox[]：自动事件信及事件版本快照；完整奖励分支仅存服务端，响应经 publicMail 脱敏。实际结果、选择和结算时间保留。
- threadSummaries[]：自己的最近八十段往来摘要；另一玩家响应中删除此字段。
- projects[def].finance：contract / facility、建设投入、合同总额、首款、已分配、已到账和经营收入。结项时间保存在项目 completedAt。

## 往来会话

thread 包含 participants、NPC 编号或搭子姓名快照、主题、消息列表、每玩家已读时间、管理员已读时间、待回复标记、学生摘要附件和可选邀请。

消息保存原生 actor UID、角色 player / npc / receipt、发件人姓名和虚构地址、纯文本正文及服务器时间。NPC 回复角色由服务端赋值，不能由客户端自报。

compound indexes（已创建）：

| 名称 | 字段顺序 |
|---|---|
| room_scopeCivil_updated | roomId ASC，scopeCivil ASC，updatedAt DESC |
| room_scopeAir_updated | roomId ASC，scopeAir ASC，updatedAt DESC |
| room_kind_updated | roomId ASC，kind ASC，updatedAt DESC |

列表只查询当前园区和当前玩家 scope；信务室只查询 kind=npc。取详情时再次核对园区、参与人或管理员权限。NPC 邀请的奖励分支经 publicMail 脱敏，选择结算与房间状态、会话、请求凭证在同一个事务内提交。

## 迁移和备份

v0.4 自动补齐旧论文和专利的虚拟标题，不给历史成果伪造学生作者，也不向旧项目补发签约款。旧建设项目继续按设施计算。完整备份需要同时备份园区状态和独立会话集合；房间十二份滚动快照和玩家下载副本不包含完整往来会话。
