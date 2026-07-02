const bootConfig = window.ATM9_CONFIG || {};
const initialView = bootConfig.initialView || "overview";

const state = {
  data: null,
  wikiById: new Map(),
  namespaceById: new Map(),
  usageById: new Map(),
  view: initialView,
  wiki: {
    query: "",
    type: "item",
    namespace: "all",
    limit: 160,
    detailId: "",
  },
  mods: {
    query: "",
  },
  quests: {
    query: "",
  },
  advancements: {
    query: "",
    namespace: "all",
  },
  renderedViews: new Set(),
  livePlayers: [],
};

const typeLabels = {
  item: "物品",
  block: "方块",
  fluid: "流体",
  entity: "实体",
  effect: "效果",
  biome: "生物群系",
  enchantment: "附魔",
};

const assetVersion = "20260702-live-player-modal-1";
const atm9Config = bootConfig;
const assetBaseUrl = String(atm9Config.assetBaseUrl || "").replace(/\/+$/, "");
const liveStatusUrl = String(atm9Config.liveStatusUrl || "");
const liveRefreshMs = Number(atm9Config.liveRefreshMs || 5000);
let liveStatusTimer = null;

const guideStages = [
  {
    title: "先把整合包调顺",
    tag: "Setup",
    text: "视频路线从安装、汉化、按键和地图开始。先装汉化与拼音搜索，设置任务键、连锁挖矿、FTB 地图领地和旅行地图标点；攻略按普通生存权限改写，不依赖管理员传送、随机传送或小地图传送。",
    picks: ["ftbquests:book", "ftbultimine:ultimine", "journeymap:journeymap"],
  },
  {
    title: "开局探索与飞行",
    tag: "Early",
    text: "先靠建筑箱子、地狱堡垒和无电挖矿拿关键材料；用构建小工具、矿物视野药水和飞行药水把探索效率拉起来，再去找 ATM 矿和 Other 传送门。",
    picks: ["buildinggadgets2:gadget_exchanging", "allthemodium:allthemodium_ingot", "allthemodium:teleport_pad"],
  },
  {
    title: "AE2 越早越舒服",
    tag: "Storage",
    text: "视频很早就转 AE2：充能器、压印器、ME 驱动器、合成终端和深度磁盘先做出来。后面所有机器、精华、蜜蜂和星星材料都围绕 AE 自动合成展开。",
    picks: ["ae2:charger", "ae2:inscriber", "ae2:drive"],
  },
  {
    title: "资源先被动化",
    tag: "Passive",
    text: "在冲 ATM Star 前，先把基础资源做成被动产线：神秘农业种子、Productive Bees、刷怪龙、怪物模型、矿物处理和区块破坏器，缺什么就优先判断能不能种、养、刷。",
    picks: ["mysticalagriculture:inferium_essence", "productivebees:advanced_beehive", "hostilenetworks:deep_learner"],
  },
  {
    title: "Mekanism 是主干",
    tag: "Mekanism",
    text: "中后期围绕 Mekanism 机器样板、化学灌注、合金、能量立方、线缆、裂变燃料、涡轮、废料处理、SPS 和反物质推进。能用 Mekanism 处理的配方优先交给 Mekanism。",
    picks: ["mekanism:chemical_infuser", "mekanismgenerators:fission_reactor_casing", "mekanism:sps_casing"],
  },
  {
    title: "星星材料分批做",
    tag: "Star",
    text: "视频的核心思路是先拆 ATM Star 材料清单。能挂机的先做，被动材料提前摆；需要 boss、维度、魔法或多方块的材料按任务顺序逐个解锁。",
    picks: ["allthetweaks:atm_star", "allthetweaks:atm_star_shard", "mysticalagradditions:creative_essence"],
  },
  {
    title: "终局魔法不要拖到最后",
    tag: "Magic",
    text: "植物魔法、暮色森林、新生魔艺、血魔法、神话附魔、沉浸工程和极限反应堆都会卡星星材料。尽量在等裂变、SPS、蜜蜂和精华产物时穿插推进。",
    picks: ["botania:lexicon", "twilightforest:magic_map", "bloodmagic:altar"],
  },
  {
    title: "第一颗星后转自动星星",
    tag: "Endgame",
    text: "第一颗 ATM Star 不是终点。视频最后把 18 个星星做成 ATM Star Block，再喂给 Patrick Star Bee，离心出星星碎片，建立无限 ATM Star 流程。",
    picks: ["allthetweaks:atm_star_block", "allthetweaks:patrick_star", "productivebees:centrifuge"],
  },
];

const guideChapters = [
  {
    title: "第一章：安装、汉化与开局设置",
    summary: "目标是先把整合包调成适合长期游玩的状态，再开始发展。",
    icon: "ftbquests:book",
    sections: [
      { title: "1.1 先完成汉化与资源包顺序", text: "视频先把汉化包里的前几个文件夹放进整合包目录替换，再把资源包里的汉化和补充材质包启用。补充材质包要放在中文资源包下面，任务也可以替换成中英文对照版本。", items: ["ftbquests:book", "minecraft:written_book", "minecraft:paper"] },
      { title: "1.2 推荐额外模组", text: "启动前可以加通用拼音搜索、输入法冲突修复、现代化 UI 和亮度调节类模组。这样 JEI 搜索、中文输入和录制/洞穴探索都会更顺。", items: ["jei:jei", "jade:jade", "ftbultimine:ultimine"] },
      { title: "1.3 按键与世界规则", text: "进世界前设置任务键、FTB Ultimine 连锁挖矿键、FTB 地图和旅行地图键位。这里按不开作弊、不开管理员指令的生存路线来写；死亡不掉落、管理员传送、随机传送和小地图传送都不作为攻略必要条件。", items: ["ftbquests:book", "journeymap:journeymap", "minecraft:compass"] },
      { title: "1.4 地图用法", text: "FTB 地图负责领地、队伍权限和强加载，机器区、挖矿机区、蜜蜂区都适合强加载；旅行地图只当作探索标点和路线记录工具。看到遗迹、地牢、村庄或 Other 传送门后先标点，再用步行、船、鞘翅/飞行药水、下界交通或后续合法传送装置返回。", items: ["ftbchunks:chunk_data", "minecraft:map", "minecraft:ender_pearl"] },
    ],
  },
  {
    title: "第二章：开局探索、无电挖矿与永久飞行",
    summary: "目标是用最少机器拿到 ATM 矿、飞行和早期关键材料。",
    icon: "buildinggadgets2:gadget_exchanging",
    sections: [
      { title: "2.1 先搜建筑和战利品箱", text: "开局撸树、做便携工作台、石稿和基础工具，然后用地图找颜色异常的建筑。建筑箱子经常给背包、模板、稀有材料和前期装备，但怪物强度差异很大，先拿箱子不要恋战。", items: ["sophisticatedbackpacks:backpack", "minecraft:stone_pickaxe", "lootr:lootr_barrel"] },
      { title: "2.2 构建小工具无电清区块", text: "视频用构建小工具设置 16×16×320 的石心盒子范围，白名单各种石头与下界/末地石头，开启跳过无法操作区域。它不耗电，适合早期跟着机器挖矿。", items: ["buildinggadgets2:gadget_exchanging", "minecraft:stone", "minecraft:deepslate"] },
      { title: "2.3 凋零与无线手杖", text: "去地狱堡垒刷烈焰棒、凋零骷髅头和末影珍珠，用遮光玻璃困凋零，第一颗下界之星优先做无线手杖和破坏核心，解决没有飞行时挖矿和开路的问题。", items: ["minecraft:nether_star", "mob_grinding_utils:dark_oak_spikes", "buildinggadgets2:gadget_destruction"] },
      { title: "2.4 ATM 矿与永久飞行", text: "用矿物视野药水找 Allthemodium，做 ATM 工具和结构指南针，定位 Other 传送门。把坐标标在旅行地图里，准备食物、床、船、方块和传送门材料，按坐标赶路或走下界压缩距离。随后通过末地箱子、幻翼膜和飞行药水，再用灌注塔把药水过滤卡充到一小时，实现长期飞行。", items: ["allthemodium:allthemodium_ingot", "allthemodium:structure_compass", "pylons:infusion_pylon"] },
    ],
  },
  {
    title: "第三章：AE2、矿物处理与第一轮自动合成",
    summary: "目标是尽早进入 AE2，把背包和矿物压力转成可管理的网络。",
    icon: "ae2:drive",
    sections: [
      { title: "3.1 AE2 从陨石和充能器开始", text: "视频直接走 AE2：找陨石拿压印模板，做充能器、能源接收器、ME 驱动器、终端和合成终端。控制器前期可以先不急，先用线缆搭出能用的仓库。", items: ["ae2:charger", "ae2:inscriber", "ae2:terminal"] },
      { title: "3.2 深度磁盘和黑盒分担仓储", text: "磁盘推荐做深度磁盘，少受物品种类限制。挖矿机和外出收集可以用 Dank 黑盒，升高后格子和堆叠都很夸张，后面还能通过纠缠方块远程抽取。", items: ["ae2:drive", "dankstorage:dank_3", "entangled:block"] },
      { title: "3.3 幸运矿物处理", text: "视频用神话/邪恶工艺路线把高等级时运转移到镐子，再用 Modular Routers 的破坏模块吃镐子时运，自动把精准采集矿石敲成更多粗矿。", items: ["modularrouters:modular_router", "modularrouters:breaker_module", "evilcraft:vengeance_pickaxe"] },
      { title: "3.4 区块破坏器升级采矿", text: "资源上来后做区块破坏器。它需要专用工作台和大量材料，适合接高级存储、强加载区块和 AE/黑盒输出，作为中期主力原矿来源。", items: ["quarryplus:workbench", "quarryplus:adv_quarry", "ftbchunks:chunk_data"] },
    ],
  },
  {
    title: "第四章：Powah 发电、神秘农业与 AE 扩容",
    summary: "目标是让基础资源和自动合成速度跟上中期需求。",
    icon: "powah:thermo_generator_nitro",
    sections: [
      { title: "4.1 Powah 热力发电路线", text: "视频用 Powah 热力发电机配水槽和灵魂熔岩，基础阶段就能提供可观 FE。后续用自动合成升级发电机、充能棒和能量管，把机器加速卡供起来。", items: ["powah:thermo_generator_starter", "cookingforblockheads:sink", "powah:energizing_rod_starter"] },
      { title: "4.2 神秘农业种子优先级", text: "先做注魔祭坛和基座，套娃升级精华，再做赛特斯、红石、钻石、绿宝石、下界合金、Allthemodium、Vibranium、Unobtainium 等常用种子。缺什么先查能不能种。", items: ["mysticalagriculture:infusion_altar", "mysticalagriculture:prosperity_seed_base", "mysticalagradditions:creative_essence"] },
      { title: "4.3 有机灌注机种植", text: "视频用热力膨胀有机灌注机种精华作物：一侧进水，上方输入输出，箱子循环种子，组件升级和连接放大器提升速度。产物再接 AE 或黑盒分流。", items: ["thermal:device_tree_extractor", "thermal:machine_insolator", "thermal:upgrade_augment_2"] },
      { title: "4.4 装配矩阵和量子计算机", text: "AE 自动合成压力上来后，做 Advanced AE 装配矩阵导入样板，再做量子计算机提升并行和容量。写好的样板可用输出总线和模糊卡自动搬进矩阵。", items: ["advanced_ae:quantum_computer", "advanced_ae:adv_pattern_provider", "ae2:blank_pattern"] },
    ],
  },
  {
    title: "第五章：蜜蜂、刷怪与毕业前被动产线",
    summary: "目标是把星星材料里最耗时间的资源提前挂机生产。",
    icon: "productivebees:advanced_beehive",
    sections: [
      { title: "5.1 蜜蜂基因优化", text: "先做高级蜂箱、离心机、装瓶器、孵化器和基因检索器。用深海蜜蜂、神风特工队蜜蜂等高产蜜蜂提取基因，合成高产、友好、全天候工作的基因样本。", items: ["productivebees:advanced_beehive", "productivebees:bottler", "productivebees:gene_indexer"] },
      { title: "5.2 Patrick Star Bee 铺垫", text: "终局无限星星要用 Patrick Star Bee。提前钓到派大星蜜蜂，喂基因小时提升属性；后续用 ATM Star Block 让它变成 ATM Star Bee。", items: ["allthetweaks:patrick_star", "productivebees:treat", "productivebees:centrifuge"] },
      { title: "5.3 刷怪龙与数据模型", text: "烈焰人、凋零、末影龙、冰雪女王、恶魂塔 boss、Cataclysm boss 等能刷就刷，能模拟就模拟。棉签、刷怪龙、数据模型和生物粉碎机是星星材料的长期来源。", items: ["mob_grinding_utils:mob_masher", "hostilenetworks:data_model", "minecraft:nether_star"] },
      { title: "5.4 星星材料优先级", text: "视频建议先做会挂机卡时间的部分：Mekanism 反物质、Powah 充能合金、极限反应堆材料、蜜蜂材料、怪物材料和维度种子压缩物品。", items: ["mekanism:pellet_antimatter", "powah:energizing_rod_nitro", "allthetweaks:dimensional_seed"] },
    ],
  },
  {
    title: "第六章：Mekanism 裂变、涡轮、废料与反物质",
    summary: "目标是建立大电力、大废料和 SPS 反物质产线。",
    icon: "mekanism:sps_casing",
    sections: [
      { title: "6.1 先做 Mekanism 机器样板", text: "把冶金灌注、化学灌注、氧化、溶解、同位素离心、加压反应室、回旋气液转换等机器的样板先写好。红石、钻石、碳、黑曜石气体和各级合金要能自动补。", items: ["mekanism:chemical_infuser", "mekanism:metallurgic_infuser", "mekanism:ultimate_control_circuit"] },
      { title: "6.2 裂变燃料链", text: "硫粉到二氧化硫，氧气合三氧化硫，水蒸气合硫酸，萤石做氢氟酸；铀饼氧化后与氢氟酸合六氟化铀，再进同位素离心机得到裂变燃料。", items: ["mekanism:chemical_oxidizer", "mekanism:chemical_infuser", "mekanism:isotopic_centrifuge"] },
      { title: "6.3 大裂变与工业涡轮", text: "视频建 18×18×18 裂变和 17×17 高涡轮。反应堆只要水充足就能产大量蒸汽，蒸汽接涡轮发电，废料必须接入后续处理，千万不要拆断带废料的管道。", items: ["mekanismgenerators:fission_reactor_casing", "mekanismgenerators:turbine_casing", "mekanism:ultimate_mechanical_pipe"] },
      { title: "6.4 废料、SPS 与储能矩阵", text: "核废料通过同位素离心机和太阳能中子活化机处理成钚/钋，再做 SPS 产反物质。电力用感应矩阵缓存，涡轮输出接集成动力或通量网络。", items: ["mekanism:solar_neutron_activator", "mekanism:sps_casing", "mekanism:induction_casing"] },
    ],
  },
  {
    title: "第七章：跨模组星星材料",
    summary: "目标是跟着任务把暮色、植物魔法、新生魔艺、血魔法、工业先锋等卡点补齐。",
    icon: "botania:lexicon",
    sections: [
      { title: "7.1 暮色森林 boss 链", text: "做魔法地图后按顺序打娜迦、巫妖、牛头人/九头蛇、骑士、恶魂塔、雪怪和冰雪女王。需要奖杯和 boss 掉落时，用棉签、刷怪龙或数据模型减少重复跑图。", items: ["twilightforest:magic_map", "twilightforest:naga_trophy", "twilightforest:snow_queen_trophy"] },
      { title: "7.2 植物魔法到盖亚", text: "白雏菊转换活石活木，火红莲供魔，符文祭坛和泰拉凝聚板做泰拉钢，开精灵门做精灵钢，再打盖亚二阶段拿浮片等星星材料。", items: ["botania:pure_daisy", "botania:terra_plate", "botania:gaia_pylon"] },
      { title: "7.3 新生魔艺与龙魂", text: "用魔源罐、基座、仪式火盆、附魔装置做荒野贡物和龙魂。视频把基座接到 AE，用管道向基座送材料，手动放核心物品完成批量制作。", items: ["ars_nouveau:arcane_core", "ars_nouveau:enchanting_apparatus", "ars_nouveau:source_jar"] },
      { title: "7.4 工业先锋、血魔法与沉浸工程", text: "工业先锋负责塑料、粉红粘液、超级机器框架和凋零生成器；血魔法要速度符文与祭坛；沉浸工程要焦炉、发酵机、炼油厂和装配线一类多方块。", items: ["industrialforegoing:machine_frame_supreme", "bloodmagic:altar", "immersiveengineering:coke_oven"] },
    ],
  },
  {
    title: "第八章：ATM Star 自动化",
    summary: "目标是把第一颗星做出来，并把后续星星变成可重复生产。",
    icon: "allthetweaks:atm_star",
    sections: [
      { title: "8.1 拆清单再写样板", text: "ATM Star 要求跨模组材料，视频按任务逐项拆解。压缩物品、创造精华、维度种子、反物质、合金块、boss 材料和魔法材料都尽量写成 AE 样板。", items: ["allthetweaks:atm_star", "ae2:blank_pattern", "mysticalagradditions:creative_essence"] },
      { title: "8.2 机械合成大厅", text: "星星合成使用 Create 机械合成。先按从上到下、从左到右的顺序用便宜方块测试形状，再把真实材料接入，避免昂贵材料因为结构错误掉落或卡住。", items: ["create:mechanical_crafter", "create:depot", "create:brass_funnel"] },
      { title: "8.3 18 颗星与 ATM Star Bee", text: "做出第一颗星后继续批量做 18 颗，合成 ATM Star Block，喂给 Patrick Star Bee 变成 ATM Star Bee。离心产物有概率给 ATM Star Shard。", items: ["allthetweaks:atm_star_block", "allthetweaks:patrick_star", "allthetweaks:atm_star_shard"] },
      { title: "8.4 无限星星闭环", text: "用 ATM Star Shard 重新写 ATM Star 样板，把星星碎片、蜜蜂离心、AE 样板和被动资源线接成闭环。之后创造物品就不再靠手搓补料。", items: ["allthetweaks:atm_star_shard", "productivebees:centrifuge", "ae2:pattern_provider"] },
    ],
  },
  {
    title: "第九章：常见卡点与排查",
    summary: "目标是用视频里的经验减少长流程中最常见的返工。",
    icon: "minecraft:book",
    sections: [
      { title: "9.1 强加载和远程传输", text: "挖矿机、蜜蜂、神秘农业、刷怪龙、裂变和 SPS 都需要强加载。FTB Chunks 强加载机器区，纠缠方块适合把远处黑盒、机器或临时产线接回基地。", items: ["ftbchunks:chunk_data", "entangled:block", "dankstorage:dank_3"] },
      { title: "9.2 存储爆仓处理", text: "精华、蜜脾、粗矿和刷怪掉落会很快塞爆 AE。高堆叠材料优先进黑盒或抽屉，AE 磁盘留给复杂物品，垃圾桶/黑名单收集器清理无用装备。", items: ["dankstorage:dank_7", "storagedrawers:controller", "trashcans:item_trash_can"] },
      { title: "9.3 自动合成别急着全锁死", text: "复杂样板先少量测试，尤其是 Mekanism 气体、流体、植物魔法符文、机械合成和多方块产物。看到 JEI 材料左上角有加号，通常说明样板对上了。", items: ["ae2:pattern_encoding_terminal", "mekanism:configuration_card", "botania:runic_altar"] },
      { title: "9.4 终局先做耗时项", text: "反物质、Powah 充能合金、蜂蜜/蜜蜂基因、极限反应堆材料、boss 刷怪材料都很耗时。只要能挂机，越早摆出来越省后期等待。", items: ["mekanism:pellet_antimatter", "powah:energizing_rod_nitro", "productivebees:gene"] },
    ],
  },
];

function $(selector, root = document) {
  return root.querySelector(selector);
}

function number(value) {
  return new Intl.NumberFormat("zh-CN").format(value || 0);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function itemLabel(id) {
  const item = state.wikiById.get(id);
  if (!item) return id;
  const name = item.zh || item.name || item.en || id;
  return item.en && item.en !== name ? `${name} / ${item.en}` : name;
}

function itemNameOnly(id) {
  const item = state.wikiById.get(id);
  return item ? (item.zh || item.name || item.en || id) : id;
}

function namespaceLabel(id, withId = false) {
  const entry = state.namespaceById.get(id);
  const label = entry?.zh || entry?.name || entry?.en || id;
  return withId && label !== id ? `${label} (${id})` : label;
}

function imageForId(id) {
  return state.wikiById.get(id)?.image || "";
}

function assetUrl(src) {
  if (!src) return "";
  const resolved = src.startsWith("assets/") && assetBaseUrl ? `${assetBaseUrl}/${src}` : src;
  return src.startsWith("assets/") ? `${resolved}?v=${assetVersion}` : resolved;
}

function imageTag(src, alt, className = "thumb") {
  if (!src) {
    return `<div class="${className} empty" aria-hidden="true"></div>`;
  }
  return `<img class="${className}" src="${escapeHtml(assetUrl(src))}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" />`;
}

function compactItem(id) {
  const item = state.wikiById.get(id);
  return item ? `${item.name} (${id})` : id;
}

function renderItemRef(id) {
  const record = itemRecord(id);
  if (!record) {
    return `<code>${escapeHtml(id)}</code>`;
  }
  const label = itemLabel(id);
  return `
    <span class="mini-item inline-item" title="${escapeHtml(label)}">
      ${imageTag(record.image, label, "mini-thumb")}
      <code>${escapeHtml(label)}</code>
    </span>
  `;
}

function renderTriggerLine(line) {
  const text = String(line || "");
  const idPattern = /#?[a-z0-9_.-]+:[a-z0-9_./-]+/gi;
  let html = "";
  let lastIndex = 0;
  for (const match of text.matchAll(idPattern)) {
    html += escapeHtml(text.slice(lastIndex, match.index));
    html += renderItemRef(match[0]);
    lastIndex = match.index + match[0].length;
  }
  html += escapeHtml(text.slice(lastIndex));
  return html;
}

function itemRecord(id) {
  if (!id || id.startsWith("#")) return null;
  return state.wikiById.get(id) || null;
}

function tagRecord(id) {
  if (!id?.startsWith("#")) return null;
  const raw = id.slice(1);
  const [namespace, path = ""] = raw.split(":", 2);
  const candidates = [raw];
  if (path.endsWith("ies")) candidates.push(`${namespace}:${path.slice(0, -3)}y`);
  if (path.endsWith("s")) candidates.push(`${namespace}:${path.slice(0, -1)}`);
  if (path.includes("/")) {
    const parts = path.split("/");
    const last = parts[parts.length - 1];
    const prefix = parts.slice(0, -1).join("/");
    const singularLast = last.endsWith("ies") ? `${last.slice(0, -3)}y` : last.endsWith("s") ? last.slice(0, -1) : last;
    candidates.push(`${namespace}:${prefix ? `${prefix}/` : ""}${singularLast}`);
    candidates.push(`minecraft:${singularLast}_${prefix.replace(/s$/, "")}`);
    candidates.push(`minecraft:${last}_${prefix.replace(/s$/, "")}`);
  }
  return candidates.map((candidate) => state.wikiById.get(candidate)).find(Boolean) || null;
}

function tagLabel(id) {
  const record = tagRecord(id);
  if (record) return `标签：${itemLabel(record.id)}`;
  const raw = String(id || "").replace(/^#/, "");
  const [namespace, path = raw] = raw.split(":", 2);
  return `标签：${namespaceLabel(namespace)} / ${path.replaceAll("/", " / ").replaceAll("_", " ")}`;
}

function recipeItemSlot(entry, className = "recipe-slot") {
  const id = entry?.id || "";
  if (!id) return `<div class="${className} empty"></div>`;
  const record = itemRecord(id) || tagRecord(id);
  const label = id.startsWith("#") ? tagLabel(id) : itemLabel(id);
  const image = record?.image || "";
  const count = entry?.count && entry.count > 1 ? `<span class="slot-count">${entry.count}</span>` : "";
  if (!image) {
    return `<div class="${className} empty" title="${escapeHtml(label)}"><span>#</span>${count}</div>`;
  }
  return `<div class="${className}" title="${escapeHtml(label)}"><img src="${escapeHtml(assetUrl(image))}" alt="${escapeHtml(label)}" loading="lazy" decoding="async" />${count}</div>`;
}

function recipeTypeLabel(type) {
  const labels = {
    "minecraft:crafting_shaped": "工作台有序合成",
    "minecraft:crafting_shapeless": "工作台无序合成",
    "minecraft:stonecutting": "切石机",
    "minecraft:smelting": "熔炉",
    "minecraft:blasting": "高炉",
    "minecraft:smoking": "烟熏炉",
    "minecraft:campfire_cooking": "营火",
    "crafting_shaped": "工作台有序合成",
    "crafting_shapeless": "工作台无序合成",
    "smelting": "熔炉",
    "ad_astra:nasa_workbench": "NASA 工作台合成",
    "ad_astra:compressing": "压缩机",
    "ad_astra:alloying": "合金炉",
    "ad_astra_giselle_addon:can_upgrading": "氧气罐升级",
    "ae2:inscriber": "AE2 压印器",
    "ae2:transform": "AE2 世界转化",
    "thermal:press": "热力压机",
    "thermal:smelter": "热力感应冶炼",
    "thermal:insolator": "热力植物培育机",
    "thermal:pulverizer": "热力磨粉机",
    "thermal:centrifuge": "热力离心机",
    "thermal:sawmill": "热力锯木机",
    "thermal:furnace": "热力红石炉",
    "thermal:chiller": "热力急冻机",
    "thermal:bottler": "热力灌装机",
    "mekanism:crushing": "Mekanism 粉碎",
    "mekanism:enriching": "Mekanism 富集",
    "mekanism:mek_data": "Mekanism 数据配方",
    "create:crushing": "机械动力粉碎",
    "create:milling": "机械动力研磨",
    "create:mixing": "机械动力搅拌",
    "create:deploying": "机械动力部署",
    "create:splashing": "机械动力洗涤",
    "create:cutting": "机械动力切割",
    "create:pressing": "机械动力压制",
    "create:filling": "机械动力注液",
    "create:haunting": "机械动力缠魂",
    "create:compacting": "机械动力压块",
    "create:mechanical_crafting": "机械动力机械合成",
    "create:sequenced_assembly": "机械动力序列组装",
    "createaddition:charging": "机械动力附属充能",
    "createaddition:rolling": "机械动力附属轧制",
    "botania:mana_infusion": "植物魔法魔力灌注",
    "botania:petal_apothecary": "植物魔法花药台",
    "botania:runic_altar": "植物魔法符文祭坛",
    "botania:elven_trade": "植物魔法精灵交易",
    "bloodmagic:alchemytable": "血魔法炼金桌",
    "bloodmagic:arc": "血魔法炼金阵列",
    "bloodmagic:altar": "血魔法祭坛",
    "ars_nouveau:crush": "新生魔艺粉碎",
    "ars_nouveau:imbuement": "新生魔艺灌注",
    "ars_nouveau:dye": "新生魔艺染色",
    "occultism:ritual": "神秘学仪式",
    "occultism:miner": "神秘学矿工",
    "occultism:spirit_fire": "神秘学灵火",
    "powah:energizing": "Powah 充能",
    "industrialforegoing:dissolution_chamber": "工业先锋溶解室",
    "industrialforegoing:fluid_extractor": "工业先锋流体提取",
    "immersiveengineering:crusher": "沉浸工程粉碎机",
    "immersiveengineering:sawmill": "沉浸工程锯木机",
    "immersiveengineering:arc_furnace": "沉浸工程电弧炉",
    "immersiveengineering:cloche": "沉浸工程园艺玻璃罩",
    "immersiveengineering:bottling_machine": "沉浸工程灌装机",
    "farmersdelight:cutting": "农夫乐事砧板",
    "farmersdelight:cooking": "农夫乐事烹饪锅",
    "mysticalagriculture:awakening": "神秘农业觉醒祭坛",
    "mysticalagriculture:farmland_till": "神秘农业耕地转化",
    "silentgear:gear_crafting": "Silent Gear 部件合成",
    "silentgear:compound_part": "Silent Gear 复合部件",
    "silentgear:salvaging": "Silent Gear 拆解",
    "silentgear:conversion": "Silent Gear 转换",
  };
  if (labels[type]) return labels[type];
  if (!type.includes(":")) return type.replaceAll("_", " ");
  const [namespace, path] = type.split(":", 2);
  const readable = path
    .replaceAll("/", " / ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
  return `${namespaceLabel(namespace)}：${readable}`;
}

function recipeLabel(recipe) {
  const outputs = recipe.outputs || [];
  const outputNames = outputs
    .map((entry) => itemNameOnly(entry.id))
    .filter(Boolean);
  if (outputNames.length) {
    return outputNames.join("、");
  }
  const record = state.wikiById.get(recipe.id);
  return record ? itemNameOnly(record.id) : recipe.id;
}

function renderRecipe(recipe) {
  const outputs = (recipe.outputs || []).map((entry) => recipeItemSlot(entry)).join("");
  const title = recipeLabel(recipe);
  let body = "";
  if (recipe.kind === "grid") {
    const width = recipe.width || 3;
    body = `<div class="recipe-grid" style="grid-template-columns: repeat(${width}, 40px);">${(recipe.slots || []).map((slot) => recipeItemSlot(slot)).join("")}</div>`;
  } else if (recipe.kind === "vertical") {
    body = `<div class="recipe-list vertical">${(recipe.inputs || []).map((slot) => recipeItemSlot(slot)).join("")}</div>`;
  } else {
    body = `<div class="recipe-list">${(recipe.inputs || []).map((slot) => recipeItemSlot(slot)).join("")}</div>`;
  }
  return `
    <article class="recipe-card">
      <div class="recipe-meta">
        <span class="badge">${escapeHtml(recipeTypeLabel(recipe.type))}</span>
        <strong>${escapeHtml(title)}</strong>
        <span class="recipe-id" title="${escapeHtml(recipe.id)}">配方来源</span>
      </div>
      <div class="recipe-flow">
        ${body}
        <div class="recipe-arrow">→</div>
        <div class="recipe-output">${outputs}</div>
      </div>
    </article>
  `;
}

function recipeIngredients(recipe) {
  const entries = recipe.kind === "grid" ? (recipe.slots || []) : (recipe.inputs || []);
  return entries.filter((entry) => entry?.id);
}

function buildUsageIndex() {
  const usage = new Map();
  const recipesByOutput = state.data.recipesByOutput || {};
  for (const recipes of Object.values(recipesByOutput)) {
    for (const recipe of recipes) {
      const outputs = (recipe.outputs || [])
        .map((entry) => itemRecord(entry.id))
        .filter(Boolean);
      if (!outputs.length) continue;
      for (const input of recipeIngredients(recipe)) {
        const targets = [];
        if (input.id?.startsWith("#")) {
          const tagTarget = tagRecord(input.id);
          if (tagTarget) targets.push(tagTarget.id);
        } else if (input.id) {
          targets.push(input.id);
        }
        for (const target of targets) {
          const bucket = usage.get(target) || [];
          const signature = `${recipe.id}|${outputs.map((item) => item.id).join(",")}`;
          if (!bucket.some((row) => row.signature === signature)) {
            bucket.push({ recipe, outputs, signature });
          }
          usage.set(target, bucket);
        }
      }
    }
  }
  state.usageById = usage;
}

function compactUsageTargets(usages, limit = 6) {
  const seen = new Set();
  const items = [];
  for (const usage of usages || []) {
    for (const output of usage.outputs || []) {
      if (seen.has(output.id)) continue;
      seen.add(output.id);
      items.push(output);
      if (items.length >= limit) return items;
    }
  }
  return items;
}

function inferUsageLines(item, recipes, usages) {
  const lines = [];
  const path = item.id.split(":", 2)[1] || item.id;
  const readablePath = path.replaceAll("/", " ").replaceAll("_", " ");
  const lower = `${item.id} ${item.name} ${item.en || ""}`.toLowerCase();
  const mod = item.namespace;

  if (item.details?.length) {
    lines.push("官方文本已提供说明，优先以官方 tooltip/语言文件为准。");
  }
  if (recipes.length) {
    const recipeTypes = Array.from(new Set(recipes.map((recipe) => recipeTypeLabel(recipe.type)))).slice(0, 3).join("、");
    lines.push(`可以通过 ${recipeTypes} 获得；下方合成表展示了本地数据包中解析到的做法。`);
  }
  if (usages.length) {
    const targets = compactUsageTargets(usages, 5).map((target) => itemNameOnly(target.id)).join("、");
    lines.push(`会作为材料继续用于 ${targets}${usages.length > 5 ? ` 等 ${number(usages.length)} 个配方` : ""}。`);
  }

  const modLines = {
    ae2: "属于 AE2 体系，通常服务于 ME 网络、存储、自动合成、频道或处理器产线。",
    appmek: "属于 Applied Mekanistics，用来把 Mekanism 化学品接入 AE 存储与自动化。",
    advanced_ae: "属于 Advanced AE，主要扩展 AE2 的大规模样板、量子计算和高并行自动合成。",
    mekanism: "属于 Mekanism 体系，常用于机器加工、化学品、气体/浆液处理、能源传输或反应堆产线。",
    mekanismgenerators: "属于 Mekanism 发电体系，围绕热力、裂变、涡轮、聚变和大规模 FE 供能展开。",
    create: "属于机械动力体系，通常通过转速、应力、物流和机械合成参与自动化。",
    powah: "属于 Powah 能源体系，用于 FE 发电、储能、充能或无线供电升级。",
    mysticalagriculture: "属于神秘农业体系，主要用于把资源转成种子、精华或精华升级材料，实现被动生产。",
    mysticalagradditions: "属于神秘农业扩展，通常与终局精华、创造精华和高阶资源种子有关。",
    productivebees: "属于 Productive Bees，通常用于蜜蜂繁殖、基因优化、蜂箱生产、蜂蜜/蜜脾离心和终局资源产线。",
    industrialforegoing: "属于工业先锋，常用于塑料、机器框架、流体、刷怪、作物和激光钻等自动化。",
    botania: "属于植物魔法，围绕魔力、符文、泰拉钢、精灵交易和盖亚流程展开。",
    ars_nouveau: "属于新生魔艺，围绕魔源、仪式、基座、法术和附魔装置展开。",
    bloodmagic: "属于血魔法，通常与血祭坛、石板、符文、仪式和生命源质有关。",
    thermal: "属于热力系列，通常用于机器加工、升级组件、流体/物品处理和自动化辅助。",
    immersiveengineering: "属于沉浸工程，常通过多方块机器、线缆、油品、装配线和工程师工作台推进。",
    twilightforest: "属于暮色森林，通常来自维度探索、boss 战利品、奖杯或后续星星材料。",
    ad_astra: "属于 Ad Astra 星际探索，通常与 NASA 工作台、火箭、燃料、氧气、星球探索和太空装备有关。",
  };
  if (modLines[mod]) lines.push(modLines[mod]);

  const rules = [
    [/generator|dynamo|reactor|turbine|solar|thermo|furnator|magmator/, "名称/注册名指向发电设备，主要功能是把燃料、热源、蒸汽或太阳能转换成 FE。"],
    [/cable|wire|pipe|tube|duct|transmitter|conduit/, "名称/注册名指向传输组件，用于连接机器并传递能量、物品、流体、气体或化学品。"],
    [/tank|cell|disk|drive|storage|barrel|drawer|black_hole|dank/, "名称/注册名指向存储组件，用于扩展物品、流体、能量或网络容量。"],
    [/upgrade|augment|addon|card|module|install/, "名称/注册名指向升级/模块，通常放入机器、装备或网络设备中改变速度、范围、容量、过滤或自动化行为。"],
    [/seed|essence|crux|farmland/, "名称/注册名指向作物/精华体系，通常用于种植、升级精华或把资源转成可持续产出。"],
    [/bee|comb|honey|gene|treat|hive|centrifuge/, "名称/注册名指向蜜蜂体系，通常参与繁殖、基因调整、蜂箱产出或离心获取资源。"],
    [/ingot|nugget|dust|plate|gear|rod|wire|sheet|block|crystal|gem/, "名称/注册名指向基础材料，主要价值是作为中间件进入后续机器、装备、合金或终局配方。"],
    [/sword|pickaxe|axe|shovel|hoe|helmet|chestplate|leggings|boots|shield|bow/, "名称/注册名指向装备/工具，主要用于战斗、采掘、防护或探索效率提升。"],
    [/controller|interface|import|export|bus|terminal|pattern|provider|assembler/, "名称/注册名指向网络/自动合成组件，通常负责连接库存、输入输出、样板或合成执行。"],
    [/altar|ritual|pylon|pedestal|runic|infusion|enchanting/, "名称/注册名指向仪式/魔法工作站，通常需要按结构摆放并消耗魔力、源质、血液或材料完成转换。"],
    [/rocket|oxygen|fuel|launch|space|planet|nasa/, "名称/注册名指向太空探索组件，通常用于火箭制造、氧气供给、燃料处理或星球旅行。"],
    [/machine|factory|crusher|smelter|press|sawmill|infuser|enricher|washer|separator|assembler|workbench/, "名称/注册名指向加工机器或工作站，用于把输入材料转换成更高级的中间件或成品。"],
  ];
  for (const [pattern, line] of rules) {
    if (pattern.test(lower)) lines.push(line);
  }

  if (item.type === "block" && !lines.length) {
    lines.push(`这是 ${namespaceLabel(item.namespace)} 的方块条目。未找到官方说明时，可先按方块使用：放置、参与结构、多方块机器或作为装饰/材料。`);
  } else if (item.type === "item" && !lines.length) {
    lines.push(`这是 ${namespaceLabel(item.namespace)} 的物品条目。未找到官方说明时，建议先查看“可用于合成”和 JEI 用途；注册名关键词为“${readablePath}”。`);
  }

  return Array.from(new Set(lines)).slice(0, 8);
}

function renderUsagePanel(item, recipes, usages) {
  const lines = inferUsageLines(item, recipes, usages);
  const targets = compactUsageTargets(usages, 12);
  return `
    <div class="usage-panel">
      <div class="section-head compact-head">
        <h3>用法与功能</h3>
        <span class="badge">${item.details?.length ? "官方+推断" : "推断"}</span>
      </div>
      <div class="usage-list">
        ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
      </div>
      ${targets.length ? `
        <div class="section-head compact-head">
          <h3>可用于合成</h3>
          <span class="badge">${number(usages.length)} 个配方</span>
        </div>
        <div class="usage-targets">
          ${targets.map((target) => `
            <span class="mini-item inline-item" title="${escapeHtml(itemLabel(target.id))}">
              ${imageTag(target.image, target.name, "mini-thumb")}
              <code>${escapeHtml(itemNameOnly(target.id))}</code>
            </span>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function readableItemPath(item) {
  const path = item.id.split(":", 2)[1] || item.id;
  return path.replaceAll("/", " / ").replaceAll("_", " ");
}

function uniqueList(values, limit = 8) {
  const seen = new Set();
  const result = [];
  for (const value of values.filter(Boolean)) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

function describeRecipeInputs(recipes, limit = 8) {
  const names = [];
  for (const recipe of recipes || []) {
    for (const input of recipeIngredients(recipe)) {
      names.push(input.id?.startsWith("#") ? tagLabel(input.id) : itemNameOnly(input.id));
    }
  }
  return uniqueList(names, limit);
}

function describeRecipeTypes(recipes, limit = 4) {
  return uniqueList((recipes || []).map((recipe) => recipeTypeLabel(recipe.type)), limit);
}

function usageOutputNames(usages, limit = 8) {
  return compactUsageTargets(usages, limit).map((target) => itemNameOnly(target.id));
}

function cleanSentenceName(value) {
  return String(value || "").replace(/[。；;,.，]$/g, "");
}

function classifyItemRole(item) {
  const lower = `${item.id} ${item.name} ${item.en || ""}`.toLowerCase();
  const modLines = {
    ae2: "它属于 AE2 体系，通常服务于 ME 网络、存储、自动合成、频道或处理器产线。",
    appmek: "它属于 Applied Mekanistics，重点是把 Mekanism 化学品接入 AE 存储与自动化。",
    advanced_ae: "它属于 Advanced AE，主要扩展 AE2 的大规模样板、量子计算和高并行自动合成。",
    mekanism: "它属于 Mekanism 体系，常用于机器加工、化学品、气体/浆液处理、能源传输或反应堆产线。",
    mekanismgenerators: "它属于 Mekanism 发电体系，围绕热力、裂变、涡轮、聚变和大规模 FE 供能展开。",
    create: "它属于机械动力体系，通常通过转速、应力、物流和机械合成参与自动化。",
    powah: "它属于 Powah 能源体系，用于 FE 发电、储能、充能或无线供电升级。",
    mysticalagriculture: "它属于神秘农业体系，常把资源转成种子、精华或精华升级材料，实现被动生产。",
    mysticalagradditions: "它属于神秘农业扩展，通常与终局精华、创造精华和高阶资源种子有关。",
    productivebees: "它属于 Productive Bees，常用于蜜蜂繁殖、基因优化、蜂箱生产、蜂蜜/蜜脾离心和终局资源产线。",
    industrialforegoing: "它属于工业先锋，常用于塑料、机器框架、流体、刷怪、作物和激光钻等自动化。",
    botania: "它属于植物魔法，围绕魔力、符文、泰拉钢、精灵交易和盖亚流程展开。",
    ars_nouveau: "它属于新生魔艺，围绕魔源、仪式、基座、法术和附魔装置展开。",
    bloodmagic: "它属于血魔法，通常与血祭坛、石板、符文、仪式和生命源质有关。",
    thermal: "它属于热力系列，通常用于机器加工、升级组件、流体/物品处理和自动化辅助。",
    immersiveengineering: "它属于沉浸工程，常通过多方块机器、线缆、油品、装配线和工程师工作台推进。",
    twilightforest: "它属于暮色森林，通常来自维度探索、Boss 战利品、奖杯或后续星星材料。",
    ad_astra: "它属于 Ad Astra 星际探索，通常与 NASA 工作台、火箭、燃料、氧气、星球探索和太空装备有关。",
    allthemodium: "它属于 Allthemodium 终局资源线，常用于解锁高级工具、维度探索、Allthemodium/Vibranium/Unobtainium 材料和 ATM Star 前置。",
    quarryplus: "它属于 QuarryPlus 采矿体系，通常用于区块级采掘、升级采矿机或维持中后期原矿输入。",
    hostilenetworks: "它属于 Hostile Neural Networks，主要把怪物数据模型转成可自动生产的掉落物。",
  };
  const rules = [
    [/generator|dynamo|reactor|turbine|solar|thermo|furnator|magmator/, "发电/能源设备", "主要功能是把燃料、热源、蒸汽、太阳能或反应堆流程转换成 FE，通常需要接入能量线缆、储能方块和强加载区块。"],
    [/cable|wire|pipe|tube|duct|transmitter|conduit|logistical|mechanical_pipe|pressurized_tube|universal_cable/, "传输组件", "用于连接机器并传递能量、物品、流体、气体或化学品。搭建产线时优先确认连接面、输入输出方向、过滤和通道容量。"],
    [/tank|cell|disk|drive|storage|barrel|drawer|black_hole|dank/, "存储组件", "用于扩展物品、流体、能量或网络容量。中后期建议接入 AE2/RS、抽屉控制器或黑洞类存储，避免散箱造成查找和自动化压力。"],
    [/upgrade|augment|addon|card|module|install/, "升级/模块", "通常放入机器、装备或网络设备中改变速度、范围、容量、过滤、能耗或自动化行为。使用前先确认目标机器是否支持该升级槽。"],
    [/seed|essence|crux|farmland/, "作物/精华资源", "通常用于种植、升级精华或把稀缺资源变成可持续产出。适合尽早接入自动收割、自动补种和 AE 输入。"],
    [/bee|comb|honey|gene|treat|hive|centrifuge/, "蜜蜂生产资源", "通常参与繁殖、基因调整、蜂箱产出或离心获取资源。稳定量产时需要处理花朵/方块需求、蜂箱升级、基因和产物离心。"],
    [/ingot|nugget|dust|plate|gear|rod|wire|sheet|block|crystal|gem/, "基础/中间材料", "主要价值是进入后续机器、装备、合金、结构方块或终局配方。数量需求高时应优先考虑矿物处理、种植、蜜蜂或刷怪替代来源。"],
    [/sword|pickaxe|axe|shovel|hoe|helmet|chestplate|leggings|boots|shield|bow/, "装备/工具", "用于战斗、采掘、防护或探索效率提升。升级前先看耐久、附魔兼容、是否能充能，以及是否有更高阶材料版本。"],
    [/controller|interface|import|export|bus|terminal|pattern|provider|assembler|crafting_unit|molecular/, "网络/自动合成组件", "负责连接库存、输入输出、样板或合成执行。进入 AE2/RS 阶段后，这类方块通常决定整条自动化产线是否能稳定运转。"],
    [/altar|ritual|pylon|pedestal|runic|infusion|enchanting/, "仪式/魔法工作站", "通常需要按结构摆放并消耗魔力、源质、血液或材料完成转换。建议给关键输入输出留出自动化空间。"],
    [/rocket|oxygen|fuel|launch|space|planet|nasa/, "太空探索组件", "用于火箭制造、氧气供给、燃料处理、星球旅行或行星材料解锁。推进前要同时准备供氧、燃料、电力和返回路线。"],
    [/machine|factory|crusher|smelter|press|sawmill|infuser|enricher|washer|separator|assembler|workbench|inscriber|charger/, "加工机器/工作站", "用于把输入材料转换成更高级的中间件或成品。进入自动化后，通常需要固定输入、输出抽取、能量供应和样板合成。"],
  ];
  const matched = rules.find(([pattern]) => pattern.test(lower));
  const generic = item.type === "block"
    ? "这是一个可放置方块，通常用于机器结构、功能站点、装饰或作为配方材料。"
    : "这是一个物品条目，通常需要结合合成表、用途表和所属模组流程判断价值。";
  return {
    role: matched?.[1] || (item.type === "block" ? "方块/工作组件" : "物品/材料"),
    detail: matched?.[2] || generic,
    modLine: modLines[item.namespace] || `它来自 ${namespaceLabel(item.namespace, true)}。`,
  };
}

function buildDetailedUsageSections(item, recipes, usages) {
  const role = classifyItemRole(item);
  const recipeTypes = describeRecipeTypes(recipes);
  const inputNames = describeRecipeInputs(recipes);
  const targetNames = usageOutputNames(usages);
  const usageTypes = describeRecipeTypes((usages || []).map((usage) => usage.recipe));
  const sections = [];

  sections.push({
    title: "百科定位",
    text: `${item.name} 是 ${cleanSentenceName(item.mod || namespaceLabel(item.namespace))} 的${role.role}。${role.modLine}${role.detail} 注册名路径为“${readableItemPath(item)}”，可用来判断它在模组中的系列、等级或机器分支。`,
  });

  if (recipes.length) {
    const via = recipeTypes.length ? recipeTypes.join("、") : "本地配方";
    const materials = inputNames.length ? `常见输入包括 ${inputNames.join("、")}。` : "部分配方使用标签或特殊输入，具体以合成表图标为准。";
    sections.push({
      title: "获取方式",
      text: `本地数据解析到 ${number(recipes.length)} 个获得配方，主要通过 ${via}。${materials} 如果有多个配方，通常代表它可以由压缩/拆分、机器加工、工作台合成或不同模组等价材料互相转换。`,
    });
  } else {
    const sourceHint = item.type === "block"
      ? "没有解析到直接合成表，可能来自世界生成、战利品、任务奖励、机器输出、创造模式专用、配置禁用配方，或需要通过 JEI 的用途/来源页面继续追踪。"
      : "没有解析到直接合成表，可能来自掉落、战利品、机器输出、交易、任务奖励、世界采集，或作为只在特定流程中产生的中间物。";
    sections.push({ title: "获取方式", text: sourceHint });
  }

  if (usages.length) {
    const targets = targetNames.length ? targetNames.join("、") : "后续物品";
    const machines = usageTypes.length ? `涉及的配方类型包括 ${usageTypes.join("、")}。` : "";
    sections.push({
      title: "主要用途",
      text: `它会继续作为材料进入 ${number(usages.length)} 个配方，可用于 ${targets}${usages.length > targetNames.length ? " 等产物" : ""}。${machines} 如果你正在做自动合成，建议先把这些高频去向做成样板，避免后期手搓卡线。`,
    });
  } else {
    sections.push({
      title: "主要用途",
      text: "本地配方里没有发现它作为输入的记录。它可能是终端成品、装备、装饰方块、工具、任务/成就目标，或由模组代码直接处理而不是写在普通配方 JSON 里。",
    });
  }

  const automationNotes = [];
  if (usages.length >= 20) automationNotes.push("用途很多，属于应尽早纳入 AE2/RS 自动合成或被动生产的高频材料。");
  if (recipes.length >= 3) automationNotes.push("来源不止一种，可以优先选择能自动化、能批量处理、材料压力最低的配方。");
  if (/ingot|dust|plate|gear|rod|wire|sheet|crystal|gem|essence|comb|honey/i.test(item.id)) automationNotes.push("材料类条目适合接入矿物倍化、神秘农业、蜜蜂、刷怪或机器加工，尽量不要长期手动合成。");
  if (/machine|workbench|infuser|inscriber|charger|assembler|controller|pylon|altar|reactor|generator/i.test(item.id)) automationNotes.push("机器/工作站类条目建议预留输入、输出、能量和升级空间；后期可以接样板供应器、输入总线、输出管道或物流模块。");
  if (!automationNotes.length) automationNotes.push("如果它在你的发展路线中反复出现，就把它加入收藏或自动合成样板；如果只出现一次，可以按任务节点临时制作。");
  sections.push({ title: "自动化建议", text: uniqueList(automationNotes, 3).join(" ") });

  return sections;
}

function inferUsageLines(item, recipes, usages) {
  return buildDetailedUsageSections(item, recipes, usages).map((section) => `${section.title}：${section.text}`);
}

function renderUsagePanel(item, recipes, usages) {
  const sections = buildDetailedUsageSections(item, recipes, usages);
  const targets = compactUsageTargets(usages, 12);
  return `
    <div class="usage-panel">
      <div class="section-head compact-head">
        <h3>用法与功能</h3>
        <span class="badge">${item.details?.length ? "官方+百科推断" : "百科推断"}</span>
      </div>
      <div class="usage-list rich-usage-list">
        ${sections.map((section) => `
          <article class="usage-note">
            <strong>${escapeHtml(section.title)}</strong>
            <p>${escapeHtml(section.text)}</p>
          </article>
        `).join("")}
      </div>
      ${targets.length ? `
        <div class="section-head compact-head">
          <h3>可用于合成</h3>
          <span class="badge">${number(usages.length)} 个配方</span>
        </div>
        <div class="usage-targets">
          ${targets.map((target) => `
            <span class="mini-item inline-item" title="${escapeHtml(itemLabel(target.id))}">
              ${imageTag(target.image, target.name, "mini-thumb")}
              <code>${escapeHtml(itemNameOnly(target.id))}</code>
            </span>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function renderDetailPanel(item) {
  if (!item) {
    return `<section class="content-panel detail-panel empty-detail"><h2>条目详情</h2><p class="muted">点击一个物品或方块查看说明和合成表。</p></section>`;
  }
  const recipes = state.data.recipesByOutput?.[item.id] || [];
  const details = item.details || [];
  const usages = state.usageById.get(item.id) || [];
  return `
    <section class="content-panel detail-panel">
      <div class="detail-head">
        ${imageTag(item.image, item.name, "detail-icon")}
        <div>
          <h2>${escapeHtml(item.name)}</h2>
          <p class="muted">${escapeHtml(item.mod || item.namespace)} · <span class="recipe-id" title="${escapeHtml(item.id)}">注册名</span></p>
        </div>
      </div>
      ${details.length ? `
        <div class="section-head compact-head">
          <h3>官方说明</h3>
          <span class="badge">${number(details.length)} 条</span>
        </div>
        <div class="detail-text">${details.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div>
      ` : ""}
      ${renderUsagePanel(item, recipes, usages)}
      <div class="section-head compact-head">
        <h3>合成表</h3>
        <span class="badge">${number(recipes.length)} 个</span>
      </div>
      <div class="recipe-stack">
        ${recipes.length ? recipes.map(renderRecipe).join("") : `<div class="notice">没有在本地配方文件里找到这个条目的合成表。</div>`}
      </div>
    </section>
  `;
}

function setView(view) {
  state.view = view;
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("active", section.id === `view-${view}`);
  });
}

function renderStats() {
  const stats = state.data.stats;
  const statItems = [
    ["模组元数据", stats.mods],
    ["Wiki 条目", stats.wikiEntries],
    ["物品", stats.items],
    ["方块", stats.blocks],
    ["任务章节", stats.questChapters],
    ["成就", stats.advancements || 0],
    ["MC 风格图标", stats.icons || 0],
    ["原始贴图", stats.images || 0],
    ["KubeJS 配方", state.data.customization.recipeFiles],
    ["服务端脚本", state.data.customization.serverScripts],
    ["启动脚本", state.data.customization.startupScripts],
  ];
  $("#statsGrid").innerHTML = statItems
    .map(([label, value]) => `<div class="stat"><strong>${number(value)}</strong><span>${label}</span></div>`)
    .join("");
  $("#sourceLine").textContent = "ATM9整合包攻略&WIKI";
}

function renderOverview() {
  const customization = state.data.customization;
  const namespaceBadges = (state.data.namespaces || [])
    .slice(0, 8)
    .map((entry) => `<span class="badge copper">${escapeHtml(entry.zh || entry.name || entry.id)} · ${number(entry.count)}</span>`)
    .join("") || state.data.topNamespaces.slice(0, 8).map(([name, count]) => `<span class="badge copper">${name} · ${number(count)}</span>`).join("");
  $("#view-overview").innerHTML = `
    <div class="layout">
      <aside class="side-panel">
        <h3>核心入口</h3>
        <p class="muted">这份资料来自本地整合包，不依赖外部 Wiki。</p>
        <div class="quick-list">
          <button data-jump="guide">阶段攻略</button>
          <button data-jump="wiki" data-query="atm_star">查 ATM Star</button>
          <button data-jump="quests">任务章节</button>
          <button data-jump="mods">模组清单</button>
        </div>
      </aside>
      <div class="content-stack">
        ${renderLiveStatusPanel()}
        <section class="content-panel">
          <div class="section-head">
            <h2>推荐游玩主线</h2>
            <span class="badge">ATM9 · 1.20.1</span>
          </div>
          <div class="timeline">
            ${guideStages.slice(0, 5).map(renderStage).join("")}
          </div>
        </section>
        <section class="content-panel">
          <div class="section-head">
            <h2>整合包定制内容</h2>
            <span class="badge purple">KubeJS</span>
          </div>
          <div class="grid-cards">
            <article class="info-card">
              <h3>配方改动</h3>
              <p>检测到 ${number(customization.recipeFiles)} 个数据包配方文件，覆盖 AE2、Powah、Productive Bees、Mekanism、Create 等系统。</p>
            </article>
            <article class="info-card">
              <h3>脚本规模</h3>
              <p>${number(customization.serverScripts)} 个服务端脚本、${number(customization.startupScripts)} 个启动脚本、${number(customization.clientScripts)} 个客户端脚本共同组成本包的定制路线。</p>
            </article>
            <article class="info-card">
              <h3>高频命名空间</h3>
              <div class="badge-row">
                ${namespaceBadges}
              </div>
            </article>
          </div>
        </section>
        ${renderAtmStarPanel()}
      </div>
    </div>
  `;
  bindJumpButtons($("#view-overview"));
  startLiveStatus();
}

function renderLiveStatusPanel() {
  if (!liveStatusUrl) return "";
  return `
    <section class="content-panel" id="liveStatusPanel">
      <div class="section-head">
        <h2>服务器实时状态</h2>
        <span class="badge purple" id="liveStatusBadge">读取中</span>
      </div>
      <div class="grid-cards">
        <article class="info-card">
          <h3>在线人数</h3>
          <p id="livePlayerCount">正在读取 COS 数据...</p>
        </article>
        <article class="info-card live-click-card" id="livePlayersCard" role="button" tabindex="0" title="点击查看玩家详情">
          <h3>在线玩家</h3>
          <p id="livePlayers">暂无数据</p>
        </article>
        <article class="info-card">
          <h3>服务器状态</h3>
          <p id="liveServerMeta">等待首次刷新</p>
        </article>
      </div>
    </section>
  `;
}

function liveUrlWithBust(url) {
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}t=${Date.now()}`;
}

function renderLiveStatus(data) {
  const server = data.server || {};
  const rawPlayers = Array.isArray(data.players) ? data.players : Array.isArray(data.online_players) ? data.online_players : [];
  const players = rawPlayers.map((player) => typeof player === "string" ? player : player.name).filter(Boolean);
  const online = data.online ?? !String(server.status || "").toLowerCase().includes("stop");
  const playerCount = Number.isFinite(Number(data.playerCount)) ? Number(data.playerCount) : Number.isFinite(Number(server.online_count)) ? Number(server.online_count) : players.length;
  const maxPlayers = data.maxPlayers ?? data.max ?? server.max_players ?? "?";
  const tps = data.tps || data.tps1m || server.tps || "";
  const mspt = data.mspt || server.mspt || "";
  const updatedAt = data.updatedAt || data.generated_at_iso || "";
  state.livePlayers = rawPlayers;
  $("#liveStatusBadge").textContent = online ? "在线" : "离线";
  $("#livePlayerCount").textContent = `${playerCount}/${maxPlayers}`;
  $("#livePlayers").textContent = players.length ? players.join("、") : "当前没有玩家在线";
  $("#liveServerMeta").textContent = [
    server.status ? `状态：${server.status}` : "",
    tps ? `TPS：${tps}` : "",
    mspt ? `MSPT：${mspt}` : "",
    data.dimension ? `维度：${data.dimension}` : "",
    data.progress?.all_players_summary || "",
    updatedAt ? `更新时间：${updatedAt}` : "",
  ].filter(Boolean).join(" · ") || "已连接实时数据";
  bindLivePlayersCard();
}

function bindLivePlayersCard() {
  const card = $("#livePlayersCard");
  if (!card || card.dataset.bound === "true") return;
  card.dataset.bound = "true";
  card.addEventListener("click", openLivePlayersModal);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openLivePlayersModal();
    }
  });
}

function openLivePlayersModal() {
  $("#advancementModalBody").innerHTML = `
    <div class="section-head compact-head">
      <h2>在线玩家详情</h2>
      <span class="badge">${number(state.livePlayers.length)} 人</span>
    </div>
    <div class="live-player-list">
      ${state.livePlayers.length ? state.livePlayers.map(renderLivePlayerCard).join("") : `<div class="notice">当前没有在线玩家。</div>`}
    </div>
  `;
  $("#advancementModal").hidden = false;
}

function renderLivePlayerCard(player) {
  if (typeof player === "string") {
    return `<article class="live-player-card"><h3>${escapeHtml(player)}</h3><p>没有更多玩家详情。</p></article>`;
  }
  const pos = Array.isArray(player.pos) ? player.pos : [];
  const coords = pos.length >= 3
    ? `X ${formatCoord(pos[0])} · Y ${formatCoord(pos[1])} · Z ${formatCoord(pos[2])}`
    : "坐标暂无";
  return `
    <article class="live-player-card">
      <h3>${escapeHtml(player.name || "未知玩家")}</h3>
      <p>${escapeHtml(player.dimension || "未知维度")}</p>
      <code>${escapeHtml(coords)}</code>
      <span class="badge">等级 ${escapeHtml(player.xp_level ?? "?")}</span>
    </article>
  `;
}

function formatCoord(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue.toFixed(1) : String(value ?? "?");
}

async function refreshLiveStatus() {
  if (!liveStatusUrl || !$("#liveStatusPanel")) return;
  try {
    const response = await fetch(liveUrlWithBust(liveStatusUrl), { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    renderLiveStatus(text ? JSON.parse(text) : {});
  } catch (error) {
    $("#liveStatusBadge").textContent = "连接失败";
    $("#liveServerMeta").textContent = `无法读取实时数据：${error.message}`;
  }
}

function startLiveStatus() {
  if (!liveStatusUrl || liveStatusTimer) return;
  refreshLiveStatus();
  liveStatusTimer = window.setInterval(refreshLiveStatus, Math.max(3000, liveRefreshMs));
}

function renderGuide() {
  $("#view-guide").innerHTML = `
    <div class="layout">
      <aside class="side-panel">
        <h3>大章</h3>
        <div class="quick-list">
          ${guideChapters.map((chapter, index) => `<button data-chapter="${index}">${chapter.title}</button>`).join("")}
        </div>
      </aside>
      <div class="content-stack">
        <section class="content-panel">
          <div class="section-head">
            <h2>详细发展路线</h2>
            <span class="badge red">${guideChapters.length} 大章</span>
          </div>
          <div class="guide-chapters">
            ${guideChapters.map(renderGuideChapter).join("")}
          </div>
        </section>
        <section class="content-panel">
          <div class="section-head">
            <h2>关键建议</h2>
          </div>
          <div class="grid-cards">
            <article class="info-card">
              <h3>别把所有产线堆在一个房间</h3>
              <p>刷怪、蜂箱、作物、反应堆、矿物加工最好分区。ATM9 后期实体和管线数量很容易上来，分区能让维护舒服很多。</p>
            </article>
            <article class="info-card">
              <h3>先做“稳定”，再做“极限”</h3>
              <p>电力、存储、自动补货、垃圾回收、区块加载这几件事稳了之后，任何模组路线都会轻很多。</p>
            </article>
            <article class="info-card">
              <h3>终局材料逐项流水线化</h3>
              <p>ATM Star 的难点不是单次合成，而是多系统材料同时推进。每个子材料都尽量做成可重复生产。</p>
            </article>
          </div>
        </section>
        ${renderAtmStarPanel()}
      </div>
    </div>
  `;
  $("#view-guide").querySelectorAll("[data-chapter]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = $(`#guide-chapter-${button.dataset.chapter}`);
      if (target && !target.open) target.open = true;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderGuideChapter(chapter, index) {
  const icon = imageTag(imageForId(chapter.icon), chapter.title, "chapter-icon");
  return `
    <details class="guide-chapter" id="guide-chapter-${index}" ${index < 2 ? "open" : ""}>
      <summary>
        ${icon}
        <span>
          <strong>${escapeHtml(chapter.title)}</strong>
          <em>${escapeHtml(chapter.summary)}</em>
        </span>
      </summary>
      <div class="guide-subchapters">
        ${chapter.sections.map(renderGuideSubchapter).join("")}
      </div>
    </details>
  `;
}

function renderGuideSubchapter(section) {
  const items = section.items
    .map((id) => `
      <span class="mini-item" title="${escapeHtml(compactItem(id))}">
        ${imageTag(imageForId(id), compactItem(id), "mini-thumb")}
        <code>${escapeHtml(compactItem(id))}</code>
      </span>
    `)
    .join("");
  return `
    <article class="guide-subchapter">
      <h3>${escapeHtml(section.title)}</h3>
      <p>${escapeHtml(section.text)}</p>
      <div class="code-list">${items}</div>
    </article>
  `;
}

function renderStage(stage, index) {
  const picks = stage.picks
    .map((id) => `
      <span class="mini-item" title="${escapeHtml(id)}">
        ${imageTag(imageForId(id), compactItem(id), "mini-thumb")}
        <code>${escapeHtml(compactItem(id))}</code>
      </span>
    `)
    .join("");
  return `
    <article class="stage" id="stage-${index}">
      <div class="stage-index">${String(index + 1).padStart(2, "0")}</div>
      <div>
        <div class="badge-row"><span class="badge">${stage.tag}</span></div>
        <h3>${stage.title}</h3>
        <p>${stage.text}</p>
        <div class="code-list">${picks}</div>
      </div>
    </article>
  `;
}

function renderAtmStarPanel() {
  const seen = new Set();
  const ingredients = state.data.customization.atmStarIngredients
    .filter((entry) => {
      const key = `${entry.slot}:${entry.item}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((entry) => {
      const detail = escapeHtml(itemLabel(entry.item));
      return `
        <article class="info-card image-card">
          ${imageTag(imageForId(entry.item), itemLabel(entry.item), "card-icon")}
          <div>
            <h3>槽位 ${entry.slot}</h3>
            <p>${detail}</p>
            <div class="code-list"><code>${escapeHtml(entry.item)}</code></div>
          </div>
        </article>
      `;
    })
    .join("");

  return `
    <section class="content-panel">
      <div class="section-head">
        <h2>ATM Star 机械合成材料</h2>
        <span class="badge purple">Create 9×9</span>
      </div>
      <div class="grid-cards">${ingredients}</div>
    </section>
  `;
}

function renderWiki() {
  const namespaces = (state.data.namespaces || state.data.topNamespaces.map(([id, count]) => ({ id, name: id, count })))
    .filter((entry) => entry.id)
    .sort((a, b) => {
      const az = a.zh ? 0 : 1;
      const bz = b.zh ? 0 : 1;
      if (az !== bz) return az - bz;
      return (a.zh || a.name || a.id).localeCompare(b.zh || b.name || b.id, "zh-CN");
    })
    .slice(0, 160);
  $("#view-wiki").innerHTML = `
    <section class="tool-panel content-panel">
      <div class="section-head">
        <h2>物品 Wiki</h2>
        <span class="badge">${number(state.data.stats.wikiEntries)} 条</span>
      </div>
      <div class="toolbar">
        <input class="filter" id="wikiQuery" type="search" value="${escapeHtml(state.wiki.query)}" placeholder="搜索中文名、英文名、ID 或模组" />
        <select class="filter" id="wikiType">
          ${Object.entries(typeLabels).map(([value, label]) => `<option value="${value}" ${state.wiki.type === value ? "selected" : ""}>${label}</option>`).join("")}
          <option value="all" ${state.wiki.type === "all" ? "selected" : ""}>全部类型</option>
        </select>
        <select class="filter" id="wikiNamespace">
          <option value="all">全部命名空间</option>
          ${namespaces.map((entry) => {
            const label = entry.zh ? `${entry.zh}（${entry.id}）` : `${entry.name}（${entry.id}）`;
            return `<option value="${entry.id}" ${state.wiki.namespace === entry.id ? "selected" : ""}>${escapeHtml(label)}</option>`;
          }).join("")}
        </select>
        <button class="action" id="wikiMore">显示更多</button>
      </div>
      <div class="wiki-layout">
        <div>
          <div class="notice" id="wikiSummary"></div>
          <div class="results" id="wikiResults"></div>
        </div>
        <div id="wikiDetail"></div>
      </div>
    </section>
  `;

  $("#wikiQuery").addEventListener("input", debounce((event) => {
    state.wiki.query = event.target.value.trim();
    state.wiki.limit = 160;
    renderWikiResults();
  }, 160));
  $("#wikiType").addEventListener("change", (event) => {
    state.wiki.type = event.target.value;
    state.wiki.limit = 160;
    renderWikiResults();
  });
  $("#wikiNamespace").addEventListener("change", (event) => {
    state.wiki.namespace = event.target.value;
    state.wiki.limit = 160;
    renderWikiResults();
  });
  $("#wikiMore").addEventListener("click", () => {
    state.wiki.limit += 160;
    renderWikiResults();
  });
  renderWikiResults();
}

function renderWikiResults() {
  const query = state.wiki.query.toLowerCase();
  const type = state.wiki.type;
  const namespace = state.wiki.namespace;
  const results = [];
  let matched = 0;

  for (const item of state.data.wiki) {
    if (type !== "all" && item.type !== type) continue;
    if (namespace !== "all" && item.namespace !== namespace) continue;
    if (query) {
      const haystack = `${item.id} ${item.name} ${item.en} ${item.zh} ${item.mod} ${item.modEn || ""} ${item.modZh || ""}`.toLowerCase();
      if (!haystack.includes(query)) continue;
    }
    matched += 1;
    if (results.length < state.wiki.limit) results.push(item);
  }

  $("#wikiSummary").textContent = `匹配 ${number(matched)} 条，当前显示 ${number(results.length)} 条。`;
  $("#wikiResults").innerHTML = results.length
    ? results.map(renderWikiRow).join("")
    : `<div class="notice">没有匹配条目。</div>`;
  $("#wikiResults").onclick = (event) => {
    const row = event.target.closest("[data-detail-id]");
    if (!row) return;
    event.wikiDetailHandled = true;
    openWikiDetail(row.dataset.detailId);
  };
  renderWikiDetail();
}

function renderWikiRow(item) {
  const label = typeLabels[item.type] || item.type;
  const subtitle = item.en && item.en !== item.name ? `${item.en} · ${item.id}` : item.id;
  return `
    <article class="result-row clickable-row" data-detail-id="${escapeHtml(item.id)}">
      ${imageTag(item.image, item.name, "wiki-thumb")}
      <div class="type-pill">${label}</div>
      <div class="result-main">
        <strong>${escapeHtml(item.name)}</strong>
        <code>${escapeHtml(subtitle)}</code>
      </div>
      <span class="result-mod">${escapeHtml(item.mod || item.modZh || item.modEn || item.namespace)}</span>
      <button class="detail-button" type="button" title="查看详情">详情</button>
    </article>
  `;
}

function renderWikiDetail() {
  const detailMount = $("#wikiDetail");
  if (!detailMount) return;
  const selected = state.wiki.detailId ? state.data.wiki.find((item) => item.id === state.wiki.detailId) : null;
  detailMount.innerHTML = renderDetailPanel(selected);
}

function openWikiDetail(id) {
  const selected = state.data.wiki.find((item) => item.id === id);
  if (!selected) return;
  state.wiki.detailId = selected.id;
  renderWikiDetail();
  $("#advancementModalBody").innerHTML = renderDetailPanel(selected);
  $("#advancementModal").hidden = false;
}

function renderQuests() {
  $("#view-quests").innerHTML = `
    <section class="tool-panel content-panel">
      <div class="section-head">
        <h2>任务章节</h2>
        <span class="badge red">${number(state.data.quests.length)} 章</span>
      </div>
      <div class="toolbar">
        <input class="filter" id="questQuery" type="search" value="${escapeHtml(state.quests.query)}" placeholder="搜索章节、标题或关键物品" />
        <span></span><span></span><span></span>
      </div>
      <div class="chapter-list" id="questResults"></div>
    </section>
  `;
  $("#questQuery").addEventListener("input", debounce((event) => {
    state.quests.query = event.target.value.trim();
    renderQuestResults();
  }, 160));
  renderQuestResults();
}

function renderQuestResults() {
  const query = state.quests.query.toLowerCase();
  const chapters = state.data.quests.filter((chapter) => {
    if (!query) return true;
    return `${chapter.name} ${chapter.file} ${chapter.icon} ${chapter.titles.join(" ")} ${chapter.items.join(" ")}`.toLowerCase().includes(query);
  });
  $("#questResults").innerHTML = chapters
    .map((chapter) => {
      const titles = chapter.titles.slice(0, 5).map((title) => `<span class="badge">${escapeHtml(title)}</span>`).join("");
      const items = chapter.items.slice(0, 9).map((id) => `<code>${escapeHtml(compactItem(id))}</code>`).join("");
      return `
        <details class="chapter quest-detail-card">
          <summary class="chapter-head">
            ${imageTag(chapter.image, chapter.name, "chapter-icon")}
            <span>
              <strong>${escapeHtml(chapter.name)}</strong>
              <em>${number(chapter.questCount)} 个任务 · 图标 ${escapeHtml(chapter.icon || "未设置")} · 文件 ${escapeHtml(chapter.file)}</em>
            </span>
          </summary>
          <div class="badge-row">${titles || '<span class="badge copper">无显式标题</span>'}</div>
          <div class="code-list">${items}</div>
          <div class="quest-list">
            ${(chapter.quests || []).slice(0, 40).map(renderQuestDetail).join("") || `<div class="notice">这个章节没有解析到更细的任务内容。</div>`}
          </div>
        </details>
      `;
    })
    .join("");
}

function renderQuestDetail(quest) {
  const itemTargets = (quest.items || []).map((id) => `
    <span class="mini-item" title="${escapeHtml(compactItem(id))}">
      ${imageTag(imageForId(id), compactItem(id), "mini-thumb")}
      <code>${escapeHtml(compactItem(id))}</code>
    </span>
  `).join("");
  const advTargets = (quest.advancements || []).map((id) => `<code title="成就或进度目标">${escapeHtml(id)}</code>`).join("");
  return `
    <article class="quest-entry">
      <h3>${escapeHtml(quest.title)}</h3>
      ${quest.subtitle && quest.subtitle !== quest.title ? `<p class="quest-subtitle">${escapeHtml(quest.subtitle)}</p>` : ""}
      ${quest.description ? `<p>${escapeHtml(quest.description)}</p>` : ""}
      <div class="code-list">${itemTargets}${advTargets}</div>
    </article>
  `;
}

function renderAdvancements() {
  const namespaces = Array.from(new Set((state.data.advancements || []).map((adv) => adv.namespace)))
    .sort((a, b) => namespaceLabel(a).localeCompare(namespaceLabel(b), "zh-CN"));
  $("#view-advancements").innerHTML = `
    <section class="tool-panel content-panel">
      <div class="section-head">
        <h2>成就与进度</h2>
        <span class="badge purple">${number(state.data.advancements?.length || 0)} 条</span>
      </div>
      <div class="toolbar">
        <input class="filter" id="advancementQuery" type="search" value="${escapeHtml(state.advancements.query)}" placeholder="搜索成就、描述、触发方式或命名空间" />
        <select class="filter" id="advancementNamespace">
          <option value="all">全部命名空间</option>
          ${namespaces.map((namespace) => `<option value="${namespace}" ${state.advancements.namespace === namespace ? "selected" : ""}>${escapeHtml(namespaceLabel(namespace, true))}</option>`).join("")}
        </select>
        <span></span><span></span>
      </div>
      <div class="notice" id="advancementSummary"></div>
      <div class="advancement-list" id="advancementResults"></div>
    </section>
  `;
  $("#advancementQuery").addEventListener("input", debounce((event) => {
    state.advancements.query = event.target.value.trim();
    renderAdvancementResults();
  }, 160));
  $("#advancementNamespace").addEventListener("change", (event) => {
    state.advancements.namespace = event.target.value;
    renderAdvancementResults();
  });
  renderAdvancementResults();
}

function renderAdvancementResults() {
  const query = state.advancements.query.toLowerCase();
  const namespace = state.advancements.namespace;
  const advancements = (state.data.advancements || []).filter((advancement) => {
    if (namespace !== "all" && advancement.namespace !== namespace) return false;
    if (!query) return true;
    return `${advancement.id} ${advancement.title} ${advancement.description} ${namespaceLabel(advancement.namespace, true)} ${advancement.triggers?.join(" ")}`.toLowerCase().includes(query);
  });
  $("#advancementSummary").textContent = `匹配 ${number(advancements.length)} 条。点击成就查看触发方式。`;
  $("#advancementResults").innerHTML = advancements.map(renderAdvancementCard).join("") || `<div class="notice">没有匹配成就。</div>`;
  $("#advancementResults").querySelectorAll("[data-advancement-id]").forEach((card) => {
    card.addEventListener("click", () => {
      const advancement = (state.data.advancements || []).find((item) => item.id === card.dataset.advancementId);
      openAdvancementModal(advancement);
    });
  });
}

function renderAdvancementCard(advancement) {
  return `
    <article class="advancement-card" data-advancement-id="${escapeHtml(advancement.id)}">
      ${imageTag(advancement.image, advancement.title, "chapter-icon")}
      <div>
        <h3>${escapeHtml(advancement.title)}</h3>
        <p>${escapeHtml(advancement.description || "无描述")}</p>
        <div class="badge-row">
          <span class="badge">${escapeHtml(namespaceLabel(advancement.namespace, true))}</span>
          <span class="badge ${advancement.frame === "challenge" ? "red" : advancement.frame === "goal" ? "purple" : ""}">${escapeHtml(advancement.frame || "task")}</span>
          ${advancement.hidden ? `<span class="badge copper">隐藏</span>` : ""}
        </div>
      </div>
    </article>
  `;
}

function openAdvancementModal(advancement) {
  if (!advancement) return;
  $("#advancementModalBody").innerHTML = `
    <div class="detail-head">
        ${imageTag(advancement.image, advancement.title, "detail-icon")}
        <div>
          <h2>${escapeHtml(advancement.title)}</h2>
          <p class="muted">${escapeHtml(advancement.description || "无描述")} · ${escapeHtml(namespaceLabel(advancement.namespace, true))} · <code>${escapeHtml(advancement.id)}</code></p>
        </div>
    </div>
    <h3>触发方式</h3>
    <div class="trigger-list">
      ${(advancement.triggers || []).map((line) => `<div class="trigger-row">${renderTriggerLine(line)}</div>`).join("")}
    </div>
  `;
  $("#advancementModal").hidden = false;
}

function closeAdvancementModal() {
  $("#advancementModal").hidden = true;
}

function renderMods() {
  $("#view-mods").innerHTML = `
    <section class="tool-panel content-panel">
      <div class="section-head">
        <h2>模组清单</h2>
        <span class="badge purple">${number(state.data.mods.length)} 条元数据</span>
      </div>
      <div class="toolbar">
        <input class="filter" id="modQuery" type="search" value="${escapeHtml(state.mods.query)}" placeholder="搜索模组名称、ID 或 jar 文件" />
        <span></span><span></span><span></span>
      </div>
      <div class="mod-list" id="modResults"></div>
    </section>
  `;
  $("#modQuery").addEventListener("input", debounce((event) => {
    state.mods.query = event.target.value.trim();
    renderModResults();
  }, 160));
  renderModResults();
}

function renderModResults() {
  const query = state.mods.query.toLowerCase();
  const mods = state.data.mods.filter((mod) => {
    if (!query) return true;
    return `${mod.id} ${mod.name} ${mod.zh || ""} ${mod.file} ${mod.description}`.toLowerCase().includes(query);
  });
  $("#modResults").innerHTML = mods.slice(0, 260).map((mod) => `
    <article class="mod-row">
      <h3>${escapeHtml(mod.zh ? `${mod.zh}（${mod.name}）` : mod.name)}</h3>
      <div class="mod-meta"><code>${escapeHtml(mod.id)}</code> · ${escapeHtml(mod.version || "版本未写入")} · ${escapeHtml(mod.file)}</div>
      ${mod.description ? `<p class="mod-meta">${escapeHtml(mod.description)}</p>` : ""}
    </article>
  `).join("");
}

function bindJumpButtons(root) {
  root.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.jump;
      if (target === "wiki" && button.dataset.query) {
        state.wiki.query = button.dataset.query;
        state.wiki.type = "all";
      }
      renderView(target);
      state.renderedViews.add(target);
      setView(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function renderView(view) {
  if (view === "overview") renderOverview();
  if (view === "guide") renderGuide();
  if (view === "wiki") renderWiki();
  if (view === "advancements") renderAdvancements();
  if (view === "quests") renderQuests();
  if (view === "mods") renderMods();
}

function ensureViewRendered(view) {
  if (!state.data || state.renderedViews.has(view)) return;
  renderView(view);
  state.renderedViews.add(view);
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

async function loadData() {
  document.querySelectorAll(".view").forEach((view) => {
    view.innerHTML = `<div class="loading">正在载入本地资料...</div>`;
  });
  const response = await fetch(`data/wiki-data.json?v=${assetVersion}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  state.data = await response.json();
  for (const item of state.data.wiki) {
    if (!state.wikiById.has(item.id)) {
      state.wikiById.set(item.id, item);
    }
  }
  for (const entry of state.data.namespaces || []) {
    state.namespaceById.set(entry.id, entry);
  }
  for (const mod of state.data.mods || []) {
    if (!state.namespaceById.has(mod.id)) {
      state.namespaceById.set(mod.id, { id: mod.id, name: mod.zh || mod.name || mod.id, zh: mod.zh || "", en: mod.name || mod.id });
    }
  }
  buildUsageIndex();
  state.renderedViews.clear();
  renderStats();
  ensureViewRendered(initialView);
  setView(initialView);
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    ensureViewRendered(button.dataset.view);
    setView(button.dataset.view);
  });
});

document.addEventListener("click", (event) => {
  if (event.wikiDetailHandled) return;
  const row = event.target.closest("[data-detail-id]");
  if (!row || !$("#wikiResults")?.contains(row)) return;
  openWikiDetail(row.dataset.detailId);
});

$("#advancementClose")?.addEventListener("click", closeAdvancementModal);
$("#advancementModal")?.addEventListener("click", (event) => {
  if (event.target.id === "advancementModal") closeAdvancementModal();
});

loadData().catch((error) => {
  $("#sourceLine").textContent = "资料载入失败。请通过本地服务器打开该目录。";
  $("#view-overview").innerHTML = `<div class="notice">无法读取 data/wiki-data.json：${escapeHtml(error.message)}</div>`;
});
