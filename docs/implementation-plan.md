# 马原知识宇宙实施计划 · 2026-10-03

用户已批准双视图与五类学习功能，现明确独立开发。最终项目：D:/code_files/考研政治工程文件/马原知识宇宙。临时开发位置为应用允许写入的可视化目录，完成后同步到工程目录。

## 架构和约束

- 原生 HTML/CSS/JavaScript，无第三方运行时依赖、远程字体或 CDN；入口 index.html 可 file:// 打开。
- assets/data.js 为共享知识数据；assets/core.js 为可测试的进度、检索、实验模型；assets/app.js 为视图控制；assets/styles.css 为独立视觉。
- 知识地图与知识星球共享选中节点、章节和进度。提供搜索、关系筛选、缩放和平移。
- 概念辨析、三个关系实验、三类回忆和原创练习必须能完成交互并得到解释。
- 已浏览、自评掌握、练习结果分开记录。本地保存失败要提示；JSON 导入必须验证版本、节点、状态和数值，失败不能覆盖旧进度。
- 观澜默认关闭。assets/guanlan-adapter.js 提供显式 connect/disconnect，验证消息来源和协议、主题不被宿主覆盖、账号上下文不得通过任意 URL 自动启用。
- 数据覆盖七模块，80–120 个节点、15–20 组辨析。来源标注实际读过的章节或文件；原创题明确标注，不伪称真题。教材 PDF 页号为 PDF 页序。
- 手机保留列表导航、详情抽屉，支持键盘与 reduced-motion。无关卡和解锁。

## 任务与验收

- [x] 内容：先运行 tests/data.test.cjs 确认缺少内容时失败；创建七模块节点、关系、辨析、原创题；检查 ID、引用、答案和来源。
- [x] 核心：先运行 tests/core.test.cjs 确认缺少功能时失败；实现 searchNodes、validateProgress、mergeProgress、recordAnswer、valueModel、phaseModel、productionModel；测试导入污染、重复答案、实验边界。
- [x] UI：创建地图／星球共享画布和知识卡；搜索定位、模块筛选、节点列表、关系解释、掌握自评、练习反馈、三种回忆、辨析和实验面板。
- [x] 接口：实现默认关闭的观澜适配，并测试来源验证、连接、事件与断开；编写接入文档，不调用真实观澜接口。
- [x] 交付：scripts/build.cjs 内联 CSS 和脚本输出 dist/马原知识宇宙.html；scripts/serve.cjs 提供 localhost 静态服务并阻止路径越界；添加启动.cmd 和 README。
- [x] 验证：node --test tests/*.test.cjs；node scripts/build.cjs；浏览器检查地图／星球、搜索、辨析、三实验、回忆、练习、保存与手机布局。记录实际结果和未核验边界。

## 数据接口

window.MAYUAN_DATA = {modules,nodes,relations,comparisons,exercises,sources}; 同时支持 module.exports 供 node 测试。
modules: {id,title,color,subtitle}; nodes: {id,title,module,summary,detail,method,trap,example,sources:[{file,label,locator}]}; relations: {id,from,to,label,kind,explanation,condition,trap}; comparisons: {id,title,left,right,rows:[{label,left,right}]}; exercises: {id,nodes,type:'single',prompt,options,answer,explanation,reason,kind:'原创',material?}。

## 交付原则

最终以独立项目和可直接使用的页面交付，不部署、不接入观澜。数据可修订；节点数与验证结果以实际输出为准。
