Page({
  data: {
    city: '',
    weather: null,
    todoInput: '',
    todos: [],
    imageUrl: ''
  },

  // 输入城市
  onInputCity: function(e) {
    this.setData({ city: e.detail.value })
  },

  // 输入待办
  onInputTodo: function(e) {
    this.setData({ todoInput: e.detail.value })
  },

  // 调用云函数查询天气
  getWeather: async function() {
    if (!this.data.city) {
      wx.showToast({ title: '请输入城市', icon: 'none' })
      return
    }

    wx.showLoading({ title: '查询中...' })
    try {
      const res = await wx.cloud.callFunction({
        name: 'getWeather',
        data: { city: this.data.city }
      })
      console.log('天气数据', res.result)
      this.setData({ weather: res.result })
      wx.showToast({ title: '查询成功', icon: 'success' })
    } catch (err) {
      console.error(err)
      wx.showToast({ title: '查询失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 添加待办
  addTodo: async function() {
    if (!this.data.todoInput) {
      wx.showToast({ title: '请输入内容', icon: 'none' })
      return
    }

    wx.showLoading({ title: '添加中...' })
    try {
      const db = wx.cloud.database()
      await db.collection('todos').add({
        data: {
          title: this.data.todoInput,
          done: false,
          createTime: db.serverDate()
        }
      })
      this.setData({ todoInput: '' })
      wx.showToast({ title: '添加成功', icon: 'success' })
      this.getTodos()
    } catch (err) {
      console.error(err)
      wx.showToast({ title: '添加失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 查询待办
  getTodos: async function() {
    wx.showLoading({ title: '加载中...' })
    try {
      const db = wx.cloud.database()
      const res = await db.collection('todos').orderBy('createTime', 'desc').get()
      console.log('待办列表', res.data)
      this.setData({ todos: res.data })
      wx.showToast({ title: '加载成功', icon: 'success' })
    } catch (err) {
      console.error(err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 切换待办状态
  toggleTodo: async function(e) {
    const { id, done } = e.currentTarget.dataset
    wx.showLoading({ title: '更新中...' })
    try {
      const db = wx.cloud.database()
      await db.collection('todos').doc(id).update({
        data: { done: !done }
      })
      wx.showToast({ title: '更新成功', icon: 'success' })
      this.getTodos()
    } catch (err) {
      console.error(err)
      wx.showToast({ title: '更新失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 删除待办
  deleteTodo: async function(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条待办吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          try {
            const db = wx.cloud.database()
            await db.collection('todos').doc(id).remove()
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.getTodos()
          } catch (err) {
            console.error(err)
            wx.showToast({ title: '删除失败', icon: 'none' })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
  },

  // 上传图片
  uploadImage: function() {
    wx.chooseImage({
      count: 1,
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        wx.showLoading({ title: '上传中...' })
        
        wx.cloud.uploadFile({
          cloudPath: 'images/' + Date.now() + '-' + Math.random() + '.png',
          filePath: tempFilePath,
          success: (res) => {
            console.log('上传成功', res.fileID)
            this.setData({ imageUrl: res.fileID })
            wx.showToast({ title: '上传成功', icon: 'success' })
          },
          fail: (err) => {
            console.error(err)
            wx.showToast({ title: '上传失败', icon: 'none' })
          },
          complete: () => {
            wx.hideLoading()
          }
        })
      }
    })
  }
})
