<template>
  <div class="com-container" @dblclick="revertMap">
    <div class="com-page" id="mycharts" ref="myRef"></div>
  </div>
</template>

<script lang="js">
  import { defineComponent, ref, onMounted, onUnmounted, watch, computed } from 'vue';
  import * as echarts from "echarts";
  import '/public/static/theme/chalk.js'
  import axios from 'axios'
  import { getProvinceMapInfo } from '@/utils/map_utils'
  import { getMockMerchantData } from '@/utils/merchant_mock_data'
  import { useStore } from "vuex";

  const TOP_MERCHANT_COUNT = 10
  const TOP_SERIES_ID = 'top-merchant-series'
  const TOP_SERIES_NAME = 'TOP10商家'
  const BLINK_INTERVAL = 700
  const GROUP_COLORS = ['#DA251D', '#E67716', '#4FC3F7']
  // 前十商家标签错开，避免相邻商家文字重叠
  const TOP_LABEL_POSITIONS = {
    北京: 'right',
    上海: 'right',
    广州: 'left',
    深圳: 'bottom',
    杭州: 'bottom',
    成都: 'left',
    武汉: 'right',
    南京: 'top'
  }

  export default defineComponent({
    name: 'echarts',
    setup() {
      let store = useStore()
      let myChart = null
      const myRef = ref(null)
      // 假数据兜底，保证地图始终有商家点位；接口可用时再与接口数据合并
      let allData = getMockMerchantData()
      let blinkTimerId = null
      let blinkOn = true
      let chartReady = false

      const theme = computed(() => store.state.theme)

      /* 获取数据：接口不可用时保留假数据展示 */
      function getData () {
        axios.get('ck/map/map', { timeout: 4000 }).then(res => {
          allData = mergeGroups(getMockMerchantData(), res.data)
          updateChart()
        }).catch(() => {
          // 接口不可用时直接使用假数据
        })
      }

      /* 合并假数据与接口数据，按分组和商家名称去重 */
      function mergeGroups (baseGroups, extraGroups) {
        const groups = baseGroups.map(group => ({
          name: group.name,
          children: group.children.map(item => ({ name: item.name, value: item.value.slice() }))
        }))
        if (!Array.isArray(extraGroups)) return groups
        extraGroups.forEach(extraGroup => {
          if (!extraGroup || !Array.isArray(extraGroup.children)) return
          let target = groups.find(group => group.name === extraGroup.name)
          if (!target) {
            target = { name: extraGroup.name, children: [] }
            groups.push(target)
          }
          extraGroup.children.forEach(child => {
            if (!child || !child.name) return
            if (target.children.some(item => item.name === child.name)) return
            target.children.push(child)
          })
        })
        return groups
      }

      /* 统一商家点位格式：value 为 [经度, 纬度, 销售额] */
      function normalizePoint (item, groupName) {
        const value = Array.isArray(item.value) ? item.value : []
        const lng = Number(value[0])
        const lat = Number(value[1])
        if (!isFinite(lng) || !isFinite(lat)) return null
        const amount = Number(value[2])
        return {
          name: item.name || '未命名商家',
          value: [lng, lat, isFinite(amount) ? amount : 0],
          group: groupName
        }
      }

      /* 刷新图表：普通商家点 + 前十商家高亮闪烁 */
      function updateChart () {
        if (!myChart || myChart.isDisposed() || !chartReady) return
        const legendArr = []
        const allPoints = []
        const seriesArr = allData.map((group, groupIndex) => {
          legendArr.push(group.name)
          const points = (group.children || [])
            .map(item => normalizePoint(item, group.name))
            .filter(Boolean)
          points.forEach(point => allPoints.push(point))
          return {
            type: 'effectScatter',
            rippleEffect: {
              scale: 4,
              brushType: 'stroke',
              color: '#FFC0CB'
            },
            name: group.name,
            data: points,
            coordinateSystem: 'geo',
            itemStyle: {
              color: GROUP_COLORS[groupIndex % GROUP_COLORS.length],
              shadowBlur: 10,
              shadowColor: '#333'
            }
          }
        })

        // 按销售额从高到低取前十商家
        const topMerchants = allPoints
          .slice()
          .sort((a, b) => b.value[2] - a.value[2])
          .slice(0, TOP_MERCHANT_COUNT)
        legendArr.push(TOP_SERIES_NAME)

        const topSeries = {
          id: TOP_SERIES_ID,
          type: 'effectScatter',
          name: TOP_SERIES_NAME,
          data: topMerchants.map(point => ({
            ...point,
            label: {
              position: TOP_LABEL_POSITIONS[point.name] || 'right'
            }
          })),
          coordinateSystem: 'geo',
          zlevel: 3,
          symbolSize: 18,
          showEffectOn: 'render',
          rippleEffect: {
            scale: 8,
            brushType: 'stroke',
            period: 3.5
          },
          itemStyle: {
            color: '#FFD700',
            shadowBlur: 20,
            shadowColor: '#FFD700'
          },
          label: {
            show: true,
            position: 'right',
            formatter: params => {
              return `${params.name} ${params.value[2]}万`
            },
            color: '#FFE58F',
            fontSize: 12,
            fontWeight: 'bold',
            textBorderColor: '#000',
            textBorderWidth: 2
          },
          labelLayout: {
            moveOverlap: 'shiftY'
          },
          emphasis: {
            scale: 1.3,
            itemStyle: {
              color: '#FFF1B8',
              shadowBlur: 30,
              shadowColor: '#FFD700'
            }
          }
        }

        myChart.setOption({
          legend: {
            data: legendArr
          },
          series: seriesArr.concat(topSeries)
        }, { replaceMerge: ['series'] })
        startBlink()
      }

      /* 前十商家高亮闪烁动画 */
      function startBlink () {
        stopBlink()
        blinkTimerId = setInterval(() => {
          if (!myChart || myChart.isDisposed()) return
          blinkOn = !blinkOn
          myChart.setOption({
            series: [{
              id: TOP_SERIES_ID,
              symbolSize: blinkOn ? 18 : 26,
              itemStyle: {
                color: blinkOn ? '#FFD700' : '#FFF7E6',
                shadowBlur: blinkOn ? 20 : 32,
                shadowColor: blinkOn ? '#FFD700' : '#FFF7E6'
              },
              rippleEffect: {
                scale: blinkOn ? 7 : 10
              }
            }]
          })
        }, BLINK_INTERVAL)
      }

      function stopBlink () {
        if (blinkTimerId) {
          clearInterval(blinkTimerId)
          blinkTimerId = null
        }
      }

      /* 优先使用接口地图数据，接口不可用时回退到本地地图资源 */
      async function loadChinaMap () {
        try {
          const res = await axios.get('/map/china.json', { timeout: 3000 })
          return res.data
        } catch (error) {
          const res = await axios.get('/static/map/china.json', { baseURL: '' })
          return res.data
        }
      }

      //屏幕适配
      function screenAdapter () {
        if (!myChart || myChart.isDisposed()) return
        const titleFontSize = myRef.value.offsetWidth / 100 * 3.6
        const adapterOption = {
          title: {
            textStyle: {
              fontSize: titleFontSize
            }
          },
          legend: {
            itemWidth: titleFontSize / 2,
            itemHeight: titleFontSize / 2,
            itemGap: titleFontSize / 2,
            textStyle: {
              fontSize: titleFontSize / 2
            }
          }
        }
        myChart.setOption(adapterOption)
        myChart.resize()
      }

      //回到中国
      function revertMap () {
        myChart.setOption({
          geo: {
            map: 'china'
          }
        })
      }

      const initT = async function () {
        myChart = echarts.init(myRef.value, theme.value);
        const chinaMap = await loadChinaMap()
        echarts.registerMap('china', chinaMap)
        const initOption = {
          title: {
            text: '▎客户地图分布',
            left: 20,
            top: 20
          },
          tooltip: {
            trigger: 'item',
            formatter: params => {
              const data = params.data || {}
              const amount = params.value && params.value[2]
              if (params.seriesId === TOP_SERIES_ID) {
                return `TOP8 商家<br/>${params.name}<br/>销售额：${amount} 万元`
              }
              return `${params.name}<br/>${data.group || ''}<br/>销售额：${amount} 万元`
            }
          },
          legend: {
            left: '5%',
            bottom: '5%',
            orient: 'vertical'
          },
          geo: {
            type: 'map',
            map: 'china',
            top: '5%',
            bottom: '5%',
            itemStyle: {
              areaColor: '#2E72BF',
              borderColor: '#333'
            }
          }
        }
        myChart.on('click', async arg => {
          // arg.name 就是所点击的省份名称, 是中文
          const provinceInfo = getProvinceMapInfo(arg.name)
          if (!provinceInfo.key) return
          const { data: ret } = await axios.get('/map' + provinceInfo.path)
          echarts.registerMap(provinceInfo.key, ret)
          myChart.setOption({
            geo: {
              map: provinceInfo.key
            }
          })
          getData()
        })

        myChart.setOption(initOption)
        chartReady = true
        updateChart()
      }

      watch(theme, () => {
        stopBlink()
        chartReady = false
        myChart.dispose()
        initT()
        screenAdapter()
        getData()
      })

      onUnmounted(() => {
        stopBlink()
        window.removeEventListener('resize', screenAdapter)
      })

      onMounted(() => {
        initT()
        getData()
        screenAdapter()
        window.addEventListener('resize', screenAdapter)
      });

      return {
        myRef,
        revertMap,
        screenAdapter
      };
    }
  });
</script>

<style lang='less' scoped>
</style>
