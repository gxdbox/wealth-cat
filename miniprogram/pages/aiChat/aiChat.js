Page({
  data: {
    messages: [],
    inputValue: '',
    loading: false,
    scrollToView: ''
  },

  onLoad: function() {
    // 加载历史对话（可选）
  },

  // 输入框输入
  onInput: function(e) {
    this.setData({ inputValue: e.detail.value })
  },

  // 发送快捷问题
  sendQuickQuestion: function(e) {
    const question = e.currentTarget.dataset.question
    this.sendMessage({ detail: { value: question } })
  },

  // 发送消息
  sendMessage: async function(e) {
    const message = e.detail ? e.detail.value : this.data.inputValue
    
    if (!message || !message.trim()) return

    // 添加用户消息
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: message,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }

    this.setData({
      messages: [...this.data.messages, userMsg],
      inputValue: '',
      loading: true,
      scrollToView: 'message-' + userMsg.id
    })

    try {
      // 调用 AI 云函数
      const res = await wx.cloud.callFunction({
        name: 'chatWithAI',
        data: {
          message: message,
          conversationId: 'chat_' + Date.now()
        }
      })

      if (res.result.success) {
        // 添加 AI 回复
        const aiMsg = {
          id: Date.now() + 1,
          role: 'ai',
          content: res.result.message,
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        }

        this.setData({
          messages: [...this.data.messages, aiMsg],
          scrollToView: 'message-' + aiMsg.id
        })
      } else {
        wx.showToast({ title: res.result.errorMsg || 'AI 回答失败', icon: 'none' })
      }
    } catch (err) {
      console.error(err)
      wx.showToast({ title: '调用失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  }
})
