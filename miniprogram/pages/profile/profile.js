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
    const userInfo = wx.getStorageSync('userInfo')
    const openid = wx.getStorageSync('openid')
    if (userInfo && openid) {
      this.setData({ userInfo, openid })
    }
  },

  onShow: function() {
    if (wx.getStorageSync('openid')) {
      this.getStatistics()
    }
  },

  getUserProfile: function() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        wx.cloud.callFunction({
          name: 'login',
          success: (cloudRes) => {
            wx.setStorageSync('userInfo', res.userInfo)
            wx.setStorageSync('openid', cloudRes.result.openid)
            this.setData({ 
              userInfo: res.userInfo, 
              openid: cloudRes.result.openid 
            })
            wx.showToast({ title: '登录成功', icon: 'success' })
            this.getStatistics()
          },
          fail: (err) => {
            wx.showToast({ title: '登录失败', icon: 'none' })
          }
        })
      },
      fail: () => {
        wx.showToast({ title: '取消授权', icon: 'none' })
      }
    })
  },

  getStatistics: async function() {
    try {
      const res = await wx.cloud.callFunction({ name: 'getStatistics' })
      if (res.result?.success) {
        this.setData({ stats: res.result.data })
      }
    } catch (err) {
      console.error(err)
    }
  },

  refreshStats: function() {
    wx.showLoading({ title: '刷新中...' })
    this.getStatistics().then(() => {
      wx.hideLoading()
      wx.showToast({ title: '刷新成功', icon: 'success' })
    })
  },

  logout: function() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
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

  goRecordList: function() {
    wx.switchTab({ url: '/pages/recordList/recordList' })
  }
})
