/**
 * 商家分布地图的演示数据（假数据）。
 * 数据结构与后端 /ck/map/map 保持一致：按客户等级分组，
 * 每个商家点位的 value 为 [经度, 纬度, 销售额(万元)]，
 * 第三位销售额用于排序出前八商家并在图上高亮闪烁展示。
 */
const MERCHANT_GROUPS = [
  {
    name: '黄金用户',
    children: [
      { name: '上海', value: [121.47, 31.23, 986] },
      { name: '北京', value: [116.4, 39.9, 952] },
      { name: '深圳', value: [114.06, 22.55, 923] },
      { name: '广州', value: [113.26, 23.13, 887] },
      { name: '杭州', value: [120.15, 30.28, 865] },
      { name: '成都', value: [104.07, 30.67, 812] },
      { name: '武汉', value: [114.3, 30.59, 780] },
      { name: '南京', value: [118.8, 32.06, 745] }
    ]
  },
  {
    name: '白金用户',
    children: [
      { name: '重庆', value: [106.55, 29.56, 702] },
      { name: '苏州', value: [120.62, 31.32, 688] },
      { name: '西安', value: [108.95, 34.27, 655] },
      { name: '天津', value: [117.2, 39.13, 630] },
      { name: '长沙', value: [112.94, 28.23, 612] },
      { name: '郑州', value: [113.62, 34.75, 590] },
      { name: '青岛', value: [120.38, 36.07, 566] },
      { name: '沈阳', value: [123.43, 41.8, 540] },
      { name: '大连', value: [121.62, 38.92, 522] },
      { name: '厦门', value: [118.09, 24.48, 498] },
      { name: '福州', value: [119.3, 26.08, 476] },
      { name: '昆明', value: [102.83, 24.88, 450] }
    ]
  },
  {
    name: '砖石用户',
    children: [
      { name: '贵阳', value: [106.63, 26.65, 430] },
      { name: '南宁', value: [108.37, 22.82, 415] },
      { name: '合肥', value: [117.23, 31.82, 398] },
      { name: '济南', value: [117, 36.65, 380] },
      { name: '哈尔滨', value: [126.63, 45.75, 360] },
      { name: '长春', value: [125.32, 43.9, 342] },
      { name: '石家庄', value: [114.51, 38.04, 322] },
      { name: '太原', value: [112.55, 37.87, 305] },
      { name: '南昌', value: [115.89, 28.68, 288] },
      { name: '兰州', value: [103.83, 36.06, 265] },
      { name: '乌鲁木齐', value: [87.62, 43.82, 240] },
      { name: '拉萨', value: [91.11, 29.65, 210] }
    ]
  }
]

/* 返回一份新的假数据，避免图表更新时修改到原始数据 */
export function getMockMerchantData () {
  return MERCHANT_GROUPS.map(group => ({
    name: group.name,
    children: group.children.map(item => ({
      name: item.name,
      value: item.value.slice()
    }))
  }))
}
