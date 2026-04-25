Page({
  data: {
    messages: [],
    inputValue: '',
    loading: false,
    scrollToView: ''
  },

  onInput: function(e) {
    this.setData({ inputValue: e.detail.value })
  },

  sendQuickQuestion: function(e) {
    this.sendMessage({ detail: { value: e.currentTarget.dataset.question } })
  },

  sendMessage: async function(e) {
    const message = e.detail?.value || this.data.inputValue
    if (!message?.trim()) return

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
      const res = await wx.cloud.callFunction({
        name: 'chatWithAI',
        data: {
          message: message,
          conversationId: 'chat_' + Date.now()
        }
      })

      if (res.result?.success) {
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
        wx.showToast({ title: res.result?.errorMsg || 'AI 回答失败', icon: 'none' })
      }
    } catch (err) {
      wx.showToast({ title: '调用失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  }
})
