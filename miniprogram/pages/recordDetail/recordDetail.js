Page({
  data: {
    record: null,
    categoryOptions: [
      { name: '餐饮', icon: '🍜', value: 'food' },
      { name: '交通', icon: '🚗', value: 'transport' },
      { name: '购物', icon: '🛍', value: 'shopping' },
      { name: '娱乐', icon: '🎬', value: 'entertainment' },
      { name: '医疗', icon: '💊', value: 'health' },
      { name: '教育', icon: '📚', value: 'education' },
      { name: '生活', icon: '🏠', value: 'life' },
      { name: '工资', icon: '💰', value: 'salary' },
      { name: '奖金', icon: '🎁', value: 'bonus' },
      { name: '投资', icon: '📈', value: 'investment' },
      { name: '兼职', icon: '💼', value: 'parttime' },
      { name: '其他', icon: '📦', value: 'other' }
    ],
    categoryIndex: 0
  },

  onLoad: function(options) {
    if (options.id) {
      this.loadRecord(options.id)
    }
  },

  loadRecord: async function(id) {
    wx.showLoading({ title: '加载中...' })

    try {
      const db = wx.cloud.database()
      const res = await db.collection('records').doc(id).get()

      if (res.data) {
        const record = res.data
        // 格式化日期
        let dateStr = record.date
        if (record.date instanceof Date) {
          dateStr = record.date.toISOString().split('T')[0]
        } else if (typeof record.date === 'string' && record.date.includes('T')) {
          dateStr = record.date.split('T')[0]
        }

        const categoryIndex = this.data.categoryOptions.findIndex(
          c => c.value === record.category
        )

        this.setData({
          record: {
            ...record,
            date: dateStr
          },
          categoryIndex: categoryIndex >= 0 ? categoryIndex : 0
        })
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 类型切换
  onTypeChange: function(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      'record.type': type
    })
  },

  // 金额输入
  onAmountInput: function(e) {
    this.setData({
      'record.amount': parseFloat(e.detail.value) || 0
    })
  },

  // 分类选择
  onCategoryChange: function(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      categoryIndex: index,
      'record.category': this.data.categoryOptions[index].value
    })
  },

  // 备注输入
  onNoteInput: function(e) {
    this.setData({
      'record.note': e.detail.value
    })
  },

  // 日期选择
  onDateChange: function(e) {
    this.setData({
      'record.date': e.detail.value
    })
  },

  // 保存编辑
  onSave: async function() {
    const record = this.data.record

    if (!record.amount || record.amount <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })

    try {
      const result = await wx.cloud.callFunction({
        name: 'updateRecord',
        data: {
          action: 'update',
          recordId: record._id,
          data: {
            type: record.type,
            amount: record.amount,
            category: record.category,
            note: record.note,
            date: record.date
          }
        }
      })

      if (result.result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' })
        wx.navigateBack()
      } else {
        wx.showToast({ title: result.result.errorMsg || '保存失败', icon: 'none' })
      }
    } catch (err) {
      console.error('保存失败', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 删除记录
  onDelete: function() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          try {
            const result = await wx.cloud.callFunction({
              name: 'updateRecord',
              data: {
                action: 'delete',
                recordId: this.data.record._id
              }
            })

            if (result.result.success) {
              wx.showToast({ title: '删除成功', icon: 'success' })
              wx.navigateBack()
            } else {
              wx.showToast({ title: result.result.errorMsg || '删除失败', icon: 'none' })
            }
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
  }
})