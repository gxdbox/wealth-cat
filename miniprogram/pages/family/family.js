Page({
  data: {
    hasFamily: false,
    familyName: '',
    joinFamilyId: '',
    family: null,
    members: [],
    records: [],
    stats: {},
    userRole: '',
    openid: ''
  },

  onLoad: function() {
    const openid = wx.getStorageSync('openid')
    this.setData({ openid })
    
    if (openid) {
      this.getFamilyData()
    }
  },

  onShow: function() {
    if (wx.getStorageSync('openid')) {
      this.getFamilyData()
    }
  },

  // 输入家庭名称
  onInputName: function(e) {
    this.setData({ familyName: e.detail.value })
  },

  // 输入家庭 ID
  onInputJoinId: function(e) {
    this.setData({ joinFamilyId: e.detail.value })
  },

  // 创建家庭
  createFamily: async function() {
    if (!this.data.familyName) {
      wx.showToast({ title: '请输入家庭名称', icon: 'none' })
      return
    }

    wx.showLoading({ title: '创建中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'createFamily',
        data: {
          familyName: this.data.familyName,
          nickname: wx.getStorageSync('userInfo').nickName || '家庭成员'
        }
      })

      if (res.result.success) {
        wx.showToast({ title: '创建成功', icon: 'success' })
        this.getFamilyData()
      } else {
        wx.showToast({ title: res.result.errorMsg, icon: 'none' })
      }
    } catch (err) {
      console.error(err)
      wx.showToast({ title: '创建失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 加入家庭
  joinFamily: async function() {
    if (!this.data.joinFamilyId) {
      wx.showToast({ title: '请输入家庭 ID', icon: 'none' })
      return
    }

    wx.showLoading({ title: '加入中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'joinFamily',
        data: {
          familyId: this.data.joinFamilyId,
          nickname: wx.getStorageSync('userInfo').nickName || '家庭成员'
        }
      })

      if (res.result.success) {
        wx.showToast({ title: '加入成功', icon: 'success' })
        this.getFamilyData()
      } else {
        wx.showToast({ title: res.result.errorMsg, icon: 'none' })
      }
    } catch (err) {
      console.error(err)
      wx.showToast({ title: '加入失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 获取家庭数据
  getFamilyData: async function() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getFamilyData'
      })

      if (res.result.success) {
        this.setData({
          hasFamily: res.result.hasFamily,
          family: res.result.family,
          members: res.result.members,
          records: res.result.records,
          stats: res.result.stats,
          userRole: res.result.userRole
        })
      }
    } catch (err) {
      console.error(err)
    }
  },

  // 复制家庭 ID
  copyFamilyId: function() {
    wx.setClipboardData({
      data: this.data.family.familyId,
      success: () => {
        wx.showToast({ title: '复制成功', icon: 'success' })
      }
    })
  },

  // 移除成员
  removeMember: function(e) {
    const { openid } = e.currentTarget.dataset
    wx.showModal({
      title: '确认移除',
      content: '确定要移除该成员吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '移除中...' })
          try {
            const db = wx.cloud.database()
            await db.collection('familyMembers')
              .where({
                familyId: this.data.family.familyId,
                openid
              })
              .remove()

            // 更新家庭人数
            await db.collection('families')
              .where({ familyId: this.data.family.familyId })
              .update({
                data: {
                  memberCount: db.command.inc(-1)
                }
              })

            wx.showToast({ title: '移除成功', icon: 'success' })
            this.getFamilyData()
          } catch (err) {
            console.error(err)
            wx.showToast({ title: '移除失败', icon: 'none' })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
  },

  // 退出家庭
  leaveFamily: function() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出这个家庭吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '退出中...' })
          try {
            const db = wx.cloud.database()
            await db.collection('familyMembers')
              .where({
                familyId: this.data.family.familyId,
                openid: this.data.openid
              })
              .remove()

            await db.collection('families')
              .where({ familyId: this.data.family.familyId })
              .update({
                data: {
                  memberCount: db.command.inc(-1)
                }
              })

            wx.showToast({ title: '已退出', icon: 'success' })
            this.getFamilyData()
          } catch (err) {
            console.error(err)
            wx.showToast({ title: '退出失败', icon: 'none' })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
  },

  // 解散家庭
  dismissFamily: function() {
    wx.showModal({
      title: '确认解散',
      content: '确定要解散这个家庭吗？所有数据将被删除！',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '解散中...' })
          try {
            const db = wx.cloud.database()
            const familyId = this.data.family.familyId

            // 删除所有成员
            await db.collection('familyMembers')
              .where({ familyId })
              .remove()

            // 删除所有家庭账单
            await db.collection('records')
              .where({ familyId })
              .remove()

            // 删除家庭
            await db.collection('families')
              .where({ familyId })
              .remove()

            wx.showToast({ title: '已解散', icon: 'success' })
            this.getFamilyData()
          } catch (err) {
            console.error(err)
            wx.showToast({ title: '解散失败', icon: 'none' })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
  }
})
