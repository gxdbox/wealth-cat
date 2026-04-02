Page({
  data: {
    records: [],
    totalExpense: 0,
    totalIncome: 0,
    balance: 0
  },

  onShow: function() {
    this.getRecords()
  },

  onPullDownRefresh: function() {
    this.getRecords().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 获取账单列表
  getRecords: async function() {
    wx.showLoading({ title: '加载中...' })

    try {
      const db = wx.cloud.database()
      const res = await db.collection('records')
        .orderBy('date', 'desc')
        .get()

      const records = res.data
      
      // 计算统计
      let totalExpense = 0
      let totalIncome = 0
      
      records.forEach(record => {
        if (record.type === 'expense') {
          totalExpense += record.amount
        } else {
          totalIncome += record.amount
        }
      })

      this.setData({
        records,
        totalExpense: totalExpense.toFixed(2),
        totalIncome: totalIncome.toFixed(2),
        balance: (totalIncome - totalExpense).toFixed(2)
      })
    } catch (err) {
      console.error(err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 获取分类图标
  getCategoryIcon: function(category) {
    const icons = {
      food: '🍜',
      transport: '🚗',
      shopping: '🛍',
      entertainment: '🎬',
      health: '💊',
      education: '📚',
      life: '🏠',
      salary: '💰',
      bonus: '🎁',
      investment: '📈',
      parttime: '💼',
      other: '📦'
    }
    return icons[category] || '📦'
  },

  // 获取分类名称
  getCategoryName: function(category) {
    const names = {
      food: '餐饮',
      transport: '交通',
      shopping: '购物',
      entertainment: '娱乐',
      health: '医疗',
      education: '教育',
      life: '生活',
      salary: '工资',
      bonus: '奖金',
      investment: '投资',
      parttime: '兼职',
      other: '其他'
    }
    return names[category] || '其他'
  },

  // 格式化日期
  formatDate: function(date) {
    if (!date) return ''
    const d = new Date(date)
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const day = d.getDate().toString().padStart(2, '0')
    return `${month}-${day}`
  },

  // 跳转到记账页
  goAccount: function() {
    wx.switchTab({
      url: '/pages/account/account'
    })
  }
})
