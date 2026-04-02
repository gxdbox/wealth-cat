Page({
  data: {
    type: 'expense',
    amount: '',
    note: '',
    category: 'food',
    date: '',
    remindEnabled: false,
    saveToFamily: false,
    hasFamily: false,
    expenseCategories: [
      { id: 'food', name: '餐饮', icon: '🍜' },
      { id: 'transport', name: '交通', icon: '🚗' },
      { id: 'shopping', name: '购物', icon: '🛍' },
      { id: 'entertainment', name: '娱乐', icon: '🎬' },
      { id: 'health', name: '医疗', icon: '💊' },
      { id: 'education', name: '教育', icon: '📚' },
      { id: 'life', name: '生活', icon: '🏠' },
      { id: 'other', name: '其他', icon: '📦' }
    ],
    incomeCategories: [
      { id: 'salary', name: '工资', icon: '💰' },
      { id: 'bonus', name: '奖金', icon: '🎁' },
      { id: 'investment', name: '投资', icon: '📈' },
      { id: 'parttime', name: '兼职', icon: '💼' },
      { id: 'other', name: '其他', icon: '📦' }
    ]
  },

  onLoad: function() {
    const today = new Date().toISOString().split('T')[0]
    this.setData({ date: today })
    
    // 读取提醒设置
    const remindEnabled = wx.getStorageSync('remindEnabled') || false
    this.setData({ remindEnabled })
    
    // 检查是否加入家庭
    this.checkFamily()
  },
  
  onShow: function() {
    this.checkFamily()
  },
  
  // 检查家庭状态
  checkFamily: async function() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getFamilyData'
      })
      if (res.result.success && res.result.hasFamily) {
        this.setData({
          hasFamily: true,
          familyId: res.result.family.familyId
        })
      }
    } catch (err) {
      console.error(err)
    }
  },

  // 跳转到语音记账
  goVoiceRecord: function() {
    wx.navigateTo({
      url: '/pages/voiceRecord/voiceRecord'
    })
  },

  // 选择类型
  selectType: function(e) {
    const { type } = e.currentTarget.dataset
    this.setData({ 
      type,
      category: type === 'expense' ? 'food' : 'salary'
    })
  },

  // 输入金额
  onInputAmount: function(e) {
    this.setData({ amount: e.detail.value })
  },

  // 输入备注
  onInputNote: function(e) {
    this.setData({ note: e.detail.value })
  },

  // 选择分类
  selectCategory: function(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ category: id })
  },

  // 选择日期
  onDateChange: function(e) {
    this.setData({ date: e.detail.value })
  },

  // 切换提醒开关
  toggleRemind: function(e) {
    const enabled = e.detail.value
    this.setData({ remindEnabled: enabled })
    wx.setStorageSync('remindEnabled', enabled)
    
    if (enabled) {
      // 请求订阅消息授权
      wx.requestSubscribeMessage({
        tmplIds: ['P09YtukMntPWMp31dja4yt-8NbRmJk5E385opFiGuXs'],
        success: (res) => {
          if (res[Object.keys(res)[0]] === 'accept') {
            wx.showToast({ title: '已开启提醒', icon: 'success' })
          }
        }
      })
    } else {
      wx.showToast({ title: '已关闭提醒', icon: 'none' })
    }
  },

  // 切换家庭账本开关
  toggleFamily: function(e) {
    this.setData({ saveToFamily: e.detail.value })
  },

  // 提交记录
  submitRecord: async function() {
    // 验证输入
    if (!this.data.amount) {
      wx.showToast({ title: '请输入金额', icon: 'none' })
      return
    }
    if (parseFloat(this.data.amount) <= 0) {
      wx.showToast({ title: '金额必须大于 0', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })

    try {
      const db = wx.cloud.database()
      const openid = wx.getStorageSync('openid')
      const userInfo = wx.getStorageSync('userInfo')
      
      const recordData = {
        type: this.data.type,
        amount: parseFloat(this.data.amount),
        note: this.data.note || '',
        category: this.data.category,
        date: this.data.date,
        createTime: db.serverDate(),
        openid,
        nickname: userInfo ? userInfo.nickName : '匿名'
      }
      
      // 如果加入了家庭且选择保存到家庭，添加 familyId
      if (this.data.saveToFamily && this.data.hasFamily) {
        recordData.familyId = this.data.familyId
      }
      
      await db.collection('records').add({
        data: recordData
      })

      // 如果开启了提醒，发送消息（异步，不阻塞）
      if (this.data.remindEnabled && openid) {
        wx.cloud.callFunction({
          name: 'sendRemind',
          data: {
            openid: openid,
            templateId: 'P09YtukMntPWMp31dja4yt-8NbRmJk5E385opFiGuXs',
            page: 'pages/recordList/recordList',
            data: {
              time1: { value: new Date().toLocaleString() },
              thing2: { value: '您有一笔新的记账记录' },
              thing3: { value: this.data.note || (this.data.type === 'expense' ? '支出' : '收入') + ' ' + this.data.amount + '元' }
            }
          },
          fail: (err) => {
            console.error('发送消息失败', err)
          }
        })
      }

      wx.showToast({ title: '记账成功', icon: 'success' })
      
      // 清空表单
      this.setData({
        amount: '',
        note: '',
        category: this.data.type === 'expense' ? 'food' : 'salary'
      })

      // 1 秒后跳转到列表页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/recordList/recordList'
        })
      }, 1000)

    } catch (err) {
      console.error(err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  }
})
