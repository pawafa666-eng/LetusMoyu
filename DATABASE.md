# 云存档结构（v0.7）

使用现有 CloudBase NoSQL。下列五个集合均为 ADMINONLY，由事件云函数 letusMoyu 读写。浏览器只调用登录和函数，不直接读写数据库。

| 集合 | 文档 ID | 主要字段 |
|---|---|---|
| letus_moyu_rooms | 园区十位邀请码 | state（完整状态 JSON 字符串）、version、updatedAt |
| letus_moyu_members | 原生认证 UID | roomId、joinedAt |
| letus_moyu_receipts | SHA256(uid:requestId) | room、actor、payloadHash、action、createdAt、threadId |
| letus_moyu_snapshots | roomId-轮转槽号 | roomId、state、version、createdAt；十二个槽 |
| letus_moyu_correspondence | 会话 UUID | roomId、scopeCivil、scopeAir、kind、updatedAt、awaitingStaff、thread（JSON 字符串） |

## 园区状态

state.rulesVersion 为 7；玩家档案 archiveVersion 为 4。主要对象：

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

## v0.5 字段与事务

沿用原有五个 ADMINONLY 文档集合与原生身份，不增加表、索引或浏览器直写权限；rulesVersion=5。

- projects[def].contract：四个阶段 steps，每阶段保存 UUID、专业任务标题、款项、available / invited / working / ready / done 状态、job 和 payouts。旧合同仅将 totalFunding − allocatedFunding 分为四阶段，库存和已入账金额不改。
- job：模式、邀请/接受时间、阶段参与 UID、学生 UUID、搭子与份额、材料费、工期、已工作时间、上次结算时间和预计截止时间。暂停期间不累计工作量。
- finance.workCosts / partnerPaid：已实际支出的工作费用与已向搭子拨付的款项；allocatedFunding 为合同累计拨款总额，receivedFunding 为主办人的实际入账。无签约首款、无新合同被动产出。
- players[uid].contractWork：当前个人工作位的项目、阶段与 job UUID；contractIncome / contractHistory 记录协作收入和验收历史。
- students[].contractWork / contractLoads / studyWeights：学生工作位、实际占用区间和每轮研究权重。研究按六小时区间与横向占用区间重叠比例结算，忙碌区间速度 50%，不会把整段离线时间一概减半。
- feed[].actorIds：归属 UID 数组。历史动态按玩家/学生原昵称补齐；共同横向显式记录双方 UID。前端按 discipline 显示姓名徽章和蓝/粉色。
- thread.messages[].grant：资源 UUID，f / r / p 三项整数、claimedAt / claimedBy 和实际到账 actual；仅 NPC 消息可由信务管理员创建。资源上限为 5000 经费、50 声望、100 论文进度。

新命令为 contract_start / contract_respond / contract_cancel / contract_claim，以及 letter_reward。全部通过原有云函数的原生 UID 校验、请求 UUID 幂等和数据库事务处理。领取附件会将玩家余额、消息领取状态、邮件回执和请求凭证一并提交；验收会将双方拨款、阶段完成状态、动态和请求凭证一并提交。重试、并发及再次点击不能重复拨款。

## v0.6 字段与兼容

rulesVersion=6，沿用原集合、权限和原生账号。迁移保留等级、资金、旧背包设备、项目和成果；工资/租费/劳务的新时钟从迁移时开始，不按旧存档创建时间补发或补扣，历史升级奖也不补领。

- players[uid].career：按当前联合实验室级别生成的职称、faculty、salaryRate 与领导称呼。
- economy：salary（lastAt / buffer / total）、开始发薪时间、上次采集数据时间、累计已发劳务、按小时合并的入账和支出汇总。工资待领上限 500。
- procurement.orders：采购 UUID、目录 ID、七步阶段、状态、供应商、固定报价、已付款、当前 job、历史流程和完成时间。job 保存办理人、学生 UID 与服务器截止时间；一位老师仅一份在办单。
- assets：资产 UUID、目录 ID、订单 UUID、采购价、建账时间、科研/租赁模式、租赁 lastAt / buffer / total，每台待领上限 1000。不将原随身小设备免费转为大型资产。
- students[].wage：rate / lastAt / buffer / total，最低硕士 1、博士 2，每人待发上限 100。待发不足时按比例分配可用整数经费，余款保留。procurementWork 保存订单与 job UUID，供横向、活动和毕业互斥检查。

新增动作 procure_create / procure_start / procure_confirm / procure_cancel / asset_mode / asset_data / student_wage。供应商报价和阶段时间取服务端目录，客户端不能自报价格、截止时间或学校工资。付款、流程状态、建账、双方升级与工资/劳务结算都在原有房间事务内完成，沿用请求 UUID 防重和滚动快照。


## v0.7 连续研究、园区场景与审稿

仍使用上述五个 ADMINONLY 集合，不新增公开读写集合。所有新操作进入原事件函数的 UID 白名单、成员检查、事务、请求回执与滚动快照。

- student.resume：本科/硕士经历、作品、推荐意见、申请说明、面谈记录；完整姓名按稳定 ID 生成。旧姓名变更时同步同一学生 ID 对应的成果作者，保留进度和劳务。
- student._mind：服务端内部能力、积极性、精力、关系、特长、性格维度及真实占用区间。student.task._difficulty、job._labor 与本科生 _skill 均为内部字段。公开状态和下载副本递归移除所有下划线前缀字段，另移除旧 reviewRoll 与学生数值 wellbeing。
- student.personality / moodText / relationshipText / researchPace / observations：可见文字反馈。availability 提供能否安排工作、出行或毕业的布尔值，不暴露内部阈值。
- player.scene / world.positions：校园与两个新区独立位置；lastMove.scene 决定动画属于哪个地区。新区地点事件、选择与消耗均由服务端保存。
- player.world：企业邀请、下一次主动联系时间、本科生报名与名册、企业/团建/竞赛 jobs。声望参与联系间隔、报名人数、合作金额与比赛结果。对方的未处理企业邀请和本科生报名材料不返回。
- player.worldWork、student.worldWork 与原横向/采购工作位共同校验，防止外部事务重复占用；写作等个人研究可同时持续但速度降低。
- paper / student.task.reviewHistory：具体审稿意见、回应、处理时间、期刊与明确版面费。proof 阶段等待显式付款，不自动扣费；发表档案保留审稿记录和实际版面费。旧发表成果不追缴。

迁移在同步时惰性运行，不重置财产、项目、论文、设备、劳务或账号。内部完整备份保存在游戏目录上一级的“备份”中，不提交 GitHub；网页导出为已过滤内部字段的玩家副本，不可替代管理员备份。
