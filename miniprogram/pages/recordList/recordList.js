Page({
  data: {
    todayRecords: [],
    pastRecords: [],
    todayWeek: ''
  },

  onShow: function() {
    this.getRecords()
  },

  onPullDownRefresh: function() {
    this.getRecords().then(() => wx.stopPullDownRefresh())
  },

  getRecords: async function() {
    wx.showLoading({ title: '加载中...' })

    try {
      const db = wx.cloud.database()
      const res = await db.collection('records').orderBy('createTime', 'desc').get()
      const records = res.data

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const todayRecords = []
      const pastRecords = []

      records.forEach(record => {
        const createTime = record.createTime ? new Date(record.createTime) : new Date()
        const processedRecord = this.processRecord(record, createTime)

        if (createTime >= todayStart) {
          todayRecords.push(processedRecord)
        } else {
          pastRecords.push(processedRecord)
        }
      })

      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const todayWeek = weekDays[new Date().getDay()]

      this.setData({
        todayRecords,
        pastRecords,
        todayWeek
      })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  processRecord: function(record, createTime) {
    const category = record.category || 'other'
    const iconMap = this.getCategoryIconMap(category)
    const timeStr = this.formatTime(createTime)
    const amountDisplay = this.formatAmount(record.amount)

    return {
      ...record,
      iconUrl: iconMap.url,
      iconBg: iconMap.bg,
      categoryName: this.getCategoryName(category),
      time: timeStr,
      amountDisplay: amountDisplay
    }
  },

  getCategoryIconMap: function(category) {
    const iconMap = {
      food: { url: '/images/icons/food.png', bg: '#ff9f43' },
      transport: { url: '/images/icons/car.png', bg: '#07c160' },
      shopping: { url: '/images/icons/shop.png', bg: '#8b5cf6' },
      entertainment: { url: '/images/icons/entertainment.png', bg: '#f43f5e' },
      health: { url: '/images/icons/health.png', bg: '#06b6d4' },
      education: { url: '/images/icons/education.png', bg: '#3b82f6' },
      life: { url: '/images/icons/life.png', bg: '#a855f7' },
      salary: { url: '/images/icons/salary.png', bg: '#07c160' },
      bonus: { url: '/images/icons/bonus.png', bg: '#f59e0b' },
      investment: { url: '/images/icons/investment.png', bg: '#10b981' },
      parttime: { url: '/images/icons/parttime.png', bg: '#6366f1' },
      other: { url: '/images/icons/other.png', bg: '#6b7280' }
    }
    return iconMap[category] || iconMap.other
  },

  getCategoryName: function(category) {
    const names = {
      food: '餐饮', transport: '交通', shopping: '购物',
      entertainment: '娱乐', health: '医疗', education: '教育',
      life: '生活', salary: '工资', bonus: '奖金',
      investment: '投资', parttime: '兼职', other: '其他'
    }
    return names[category] || '其他'
  },

  formatTime: function(date) {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  },

  formatAmount: function(amount) {
    if (!amount) return '0.00'
    return parseFloat(amount).toFixed(2)
  },

  goVoiceRecord: function() {
    wx.navigateTo({ url: '/pages/voiceRecord/voiceRecord' })
  },

  onRecordTap: function(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/recordDetail/recordDetail?id=${id}` })
  }
})
