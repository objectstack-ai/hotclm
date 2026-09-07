// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { PartyStrings } from '../strings.js';

/**
 * 四十家相对方的中文名（DESIGN.md §10）：客户、供应商、个人与政府机构，
 * 分布在集团签约的三个法域。
 *
 * 顺序与 `../demo-en/parties.ts` 严格一一对应：`../plan.ts` 按下标定位相对方，
 * `party_kind`、`country_code`、`risk_flag` 以及每一份指向这里的合同都以下标为准。
 * 中间插入一条会静默地把政府机构改写成个人，并把两家已封禁的相对方挪到本不该
 * 出现它们的合同上。只能追加，不能插入。
 *
 * 名称均为虚构，与真实公司雷同纯属巧合；且没有一个名称把行业写进 schema。
 */
export const PARTIES: readonly PartyStrings[] & { length: 40 } = [
  // 0–15 · 客户（公司）
  { name: '极光系统',       legalRepresentative: '海伦·瓦斯克斯', contactName: '普里娅·拉曼',   address: '美国马萨诸塞州波士顿海港街 400 号，02110',      bankName: '大西洋商业银行' },
  { name: '北风物流',       legalRepresentative: '托马斯·伯格',   contactName: '安娜·席尔瓦',   address: '德国汉堡港口街 12 号，20457',                   bankName: '北德商业银行' },
  { name: '红隼分析',       legalRepresentative: '露丝·奥尔德里奇', contactName: '欧文·哈特利', address: '英国伦敦芬斯伯里圆环 18 号，EC2M 7EB',          bankName: '泰晤士商业银行' },
  { name: '索伦特制造',     legalRepresentative: '加文·多伊尔',   contactName: '玛丽·方丹',     address: '英国南安普敦码头路 7 号厂房，SO14 3TL',         bankName: '泰晤士商业银行' },
  { name: '子午线零售集团', legalRepresentative: '克劳迪娅·鲁伊斯', contactName: '彼得·诺兰',   address: '美国伊利诺伊州芝加哥市场街 901 号，60607',      bankName: '五大湖信托银行' },
  { name: '玄武能源',       legalRepresentative: '英格丽·索伦森', contactName: '卢卡斯·勃兰特', address: '德国杜塞尔多夫国王大道 44 号，40212',           bankName: '莱茵信贷银行' },
  { name: '静谧传媒',       legalRepresentative: '丹尼尔·奥卡福', contactName: '索菲亚·马尔凯蒂', address: '英国伦敦夏洛特街 77 号，W1T 4PW',            bankName: '泰晤士商业银行' },
  { name: '钴蓝制药',       legalRepresentative: '娜奥米·费尔德曼', contactName: '埃里克·林奎斯特', address: '美国新泽西州普林斯顿创新路 250 号，08540', bankName: '大西洋商业银行' },
  { name: '青野农业',       legalRepresentative: '玛尔塔·科瓦尔斯基', contactName: '约纳斯·迈尔', address: '德国汉诺威田野路 3 号，30159',              bankName: '北德商业银行' },
  { name: '层云云服务',     legalRepresentative: '艾伦·惠特菲尔德', contactName: '田中优纪',     address: '美国华盛顿州西雅图太平洋大道 1200 号，98101',   bankName: '喀斯喀特联邦银行' },
  { name: '灯塔金融',       legalRepresentative: '碧翠丝·林',     contactName: '雨果·费雷拉',   address: '英国伦敦老布罗德街 30 号，EC2N 1HQ',            bankName: '泰晤士商业银行' },
  { name: '铁木建筑',       legalRepresentative: '塞缪尔·奥尔蒂斯', contactName: '娜迪娅·哈达德', address: '美国科罗拉多州丹佛采石场路 55 号，80202',      bankName: '五大湖信托银行' },
  { name: '远洋航运',       legalRepresentative: '克尔斯滕·福格尔', contactName: '马特奥·杜阿尔特', address: '德国汉堡仓库城 8 号，20457',               bankName: '北德商业银行' },
  { name: '奎隆软件',       legalRepresentative: '拉维·梅农',     contactName: '埃琳娜·彼得洛娃', address: '英国伦敦大法官巷 4 号，WC2A 1LG',            bankName: '泰晤士商业银行' },
  { name: '黑貂保险',       legalRepresentative: '格蕾丝·埃林顿', contactName: '托比亚斯·赖纳', address: '美国得克萨斯州奥斯汀国会大道 600 号，78701',    bankName: '孤星商业银行' },
  { name: '潮汐酒店',       legalRepresentative: '伊曼纽尔·西塞', contactName: '英格丽·哈尔沃森', address: '德国汉堡新围墙街 21 号，20354',              bankName: '莱茵信贷银行' },
  // 16–29 · 供应商（公司）
  { name: '花岗岩物业',     legalRepresentative: '葆拉·恩肯迪伦', contactName: '迪特·克劳泽',   address: '德国科隆工业大街 90 号，50827',                 bankName: '莱茵信贷银行' },
  { name: '灯塔印务包装',   legalRepresentative: '柯林·马什',     contactName: '阿玛拉·迪亚洛', address: '英国利兹贸易园 12 号，LS11 5DR',                bankName: '北方联合银行' },
  { name: '优势人力',       legalRepresentative: '罗莎·德尔加多', contactName: '渡边健二',       address: '美国纽约州纽约第三大道 820 号，10022',          bankName: '大西洋商业银行' },
  { name: '渡鸦安保',       legalRepresentative: '菲恩·伯恩',     contactName: '莱娜·阿赫特贝格', address: '德国柏林托尔大街 140 号，10119',              bankName: '莱茵信贷银行' },
  { name: '桤木法务支持',   legalRepresentative: '米里亚姆·施泰因', contactName: '保罗·卢梭',   address: '英国伦敦格雷律师学院广场 2 号，WC1R 5AA',       bankName: '泰晤士商业银行' },
  { name: '铜田商旅',       legalRepresentative: '艾哈迈德·扎基', contactName: '尤莉娅·诺瓦克', address: '美国伊利诺伊州芝加哥密歇根大道 311 号，60604',  bankName: '五大湖信托银行' },
  { name: '柳荫餐饮',       legalRepresentative: '希妮德·基恩',   contactName: '马可·比安基', address: '英国曼彻斯特磨坊巷 44 号，M4 1LE',                bankName: '北方联合银行' },
  { name: '港线货运',       legalRepresentative: '比约恩·阿尔托', contactName: '克洛伊·杜布瓦', address: '德国汉堡桑托凯 50 号，20457',                   bankName: '北德商业银行' },
  { name: '巅峰 IT 硬件',   legalRepresentative: '埃利斯·格兰特', contactName: '拉胡尔·巴特',   address: '美国加利福尼亚州圣何塞科技大道 3400 号，95110', bankName: '喀斯喀特联邦银行' },
  { name: '蕨道清洁',       legalRepresentative: '安妮克·菲瑟',   contactName: '托马什·沃伊奇克', address: '德国美因河畔法兰克福椴树街 15 号，60329',     bankName: '莱茵信贷银行' },
  { name: '荆棘办公用品',   legalRepresentative: '尼尔·萨瑟兰',   contactName: '法丽达·奥斯曼', address: '英国加的夫金斯威街 9 号，CF10 3BZ',             bankName: '北方联合银行' },
  { name: '玛瑙数据中心',   legalRepresentative: '薇拉·林霍尔姆', contactName: '杰克·费雷拉',   address: '美国弗吉尼亚州阿什本数据园路 1500 号，20147',   bankName: '大西洋商业银行' },
  { name: '峰顶翻译',       legalRepresentative: '哈娜·菲舍尔',   contactName: '伊莎贝尔·莫雷诺', address: '德国慕尼黑马克西米利安大街 6 号，80539',      bankName: '莱茵信贷银行' },
  { name: '红杉招聘',       legalRepresentative: '奥利弗·潘克赫斯特', contactName: '萨拉·贝里斯特伦', address: '英国伦敦坎农街 25 号，EC4M 5SH',        bankName: '泰晤士商业银行' },
  // 30–35 · 个人（独立承包人）
  { name: '马库斯·林德格伦', legalRepresentative: '马库斯·林德格伦', contactName: '马库斯·林德格伦', address: '美国俄勒冈州波特兰展望台阶 14 号，97205',   bankName: '喀斯喀特联邦银行' },
  { name: '艾莎·贝洛',       legalRepresentative: '艾莎·贝洛',       contactName: '艾莎·贝洛',       address: '英国布里斯托尔桥街 61 号，BS1 4RQ',        bankName: '北方联合银行' },
  { name: '亨里克·松德贝里', legalRepresentative: '亨里克·松德贝里', contactName: '亨里克·松德贝里', address: '德国斯图加特花园街 22 号，70173',          bankName: '莱茵信贷银行' },
  { name: '卡米尔·博尚',     legalRepresentative: '卡米尔·博尚',     contactName: '卡米尔·博尚',     address: '法国斯特拉斯堡下街 7 号，67000',            bankName: '东部银行' },
  { name: '青木大辅',         legalRepresentative: '青木大辅',       contactName: '青木大辅',       address: '日本东京都港区芝浦 2-1-3，108-0023',        bankName: '东京中央银行' },
  { name: '格蕾丝·姆贝基',   legalRepresentative: '格蕾丝·姆贝基',   contactName: '格蕾丝·姆贝基',   address: '英国利兹银街 88 号，LS1 4AG',               bankName: '北方联合银行' },
  // 36–37 · 政府机构
  { name: '汉堡港务局',       legalRepresentative: '卡特琳·埃伯特博士', contactName: '斯特凡·罗特', address: '德国汉堡新万德拉姆街 4 号，20457',          bankName: '北方州立银行' },
  { name: '马萨诸塞交通委员会', legalRepresentative: '安吉拉·普雷斯科特', contactName: '德文·卡特', address: '美国马萨诸塞州波士顿公园广场 10 号，02116',  bankName: '联邦财政银行' },
  // 38–39 · 已封禁的相对方（DESIGN.md §10：两条）
  { name: '瑞奇蒙贸易',       legalRepresentative: '不详',           contactName: '未核验',         address: '英属维尔京群岛托尔托拉罗德城邮政信箱 4471',  bankName: '未核验' },
  { name: '德尔塔岭控股',     legalRepresentative: '不详',           contactName: '未核验',         address: '巴拿马巴拿马城邮政信箱 1180',                bankName: '未核验' },
] as const;
