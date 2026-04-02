Page({
  data: {
    userInfo: null,
    openid: '',
    stats: {
      totalExpense: 0,
      totalIncome: 0,
      balance: 0,
      recordCount: 0
    }
  },

  onLoad: function() {
    // 从本地缓存读取用户信息
    const userInfo = wx.getStorageSync('userInfo')
    const openid = wx.getStorageSync('openid')
    
    if (userInfo && openid) {
      this.setData({ userInfo, openid })
      this.getStatistics()
    }
  },

  // 获取用户信息
  getUserProfile: function() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = res.userInfo
        
        // 调用登录云函数获取 openid
        wx.cloud.callFunction({
          name: 'login',
          success: (cloudRes) => {
            const openid = cloudRes.result.openid
            
            // 保存到本地缓存
            wx.setStorageSync('userInfo', userInfo)
            wx.setStorageSync('openid', openid)
            
            this.setData({ userInfo, openid })
            
            wx.showToast({ title: '登录成功', icon: 'success' })
            
            // 获取统计数据
            this.getStatistics()
          },
          fail: (err) => {
            console.error(err)
            wx.showToast({ title: '登录失败', icon: 'none' })
          }
        })
      },
      fail: (err) => {
        console.error(err)
        wx.showToast({ title: '取消授权', icon: 'none' })
      }
    })
  },

  // 获取统计数据
  getStatistics: async function() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getStatistics'
      })
      
      if (res.result.success) {
        this.setData({ stats: res.result.data })
      }
    } catch (err) {
      console.error(err)
    }
  },

  // 刷新统计
  refreshStats: function() {
    wx.showLoading({ title: '刷新中...' })
    this.getStatistics().then(() => {
      wx.hideLoading()
      wx.showToast({ title: '刷新成功', icon: 'success' })
    })
  },

  // 退出登录
  logout: function() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地缓存
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('openid')
          
          this.setData({
            userInfo: null,
            openid: '',
            stats: {
              totalExpense: 0,
              totalIncome: 0,
              balance: 0,
              recordCount: 0
            }
          })
          
          wx.showToast({ title: '已退出', icon: 'success' })
        }
      }
    })
  },

  // 跳转账单
  goRecordList: function() {
    wx.switchTab({
      url: '/pages/recordList/recordList'
    })
  },

  // 跳转记账
  goAccount: function() {
    wx.switchTab({
      url: '/pages/account/account'
    })
  }
})
