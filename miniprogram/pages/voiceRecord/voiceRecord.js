const app = getApp()

Page({
  data: {
    isRecording: false,
    manualText: '',
    loading: false,
    recorderManager: null
  },

  onLoad: function() {
    const recorderManager = wx.getRecorderManager()
    this.setData({ recorderManager })

    recorderManager.onStart(() => {
      console.log('录音开始')
    })

    recorderManager.onStop((res) => {
      this.handleRecordEnd(res.tempFilePath)
    })

    recorderManager.onError(() => {
      wx.showToast({ title: '录音失败', icon: 'none' })
      this.setData({ isRecording: false })
    })
  },

  startRecord: function() {
    this.setData({ isRecording: true })
    this.data.recorderManager.start({
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3'
    })
  },

  stopRecord: function() {
    this.setData({ isRecording: false })
    this.data.recorderManager.stop()
  },

  handleRecordEnd: async function(filePath) {
    this.setData({ loading: true })

    try {
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: 'voice/' + Date.now() + '.mp3',
        filePath: filePath
      })

      const asrRes = await wx.cloud.callFunction({
        name: 'voiceAsrTencent',
        data: { fileID: uploadRes.fileID }
      })

      if (asrRes.result?.success) {
        this.setData({ manualText: asrRes.result.voiceText })
        await this.submitToAI(asrRes.result.voiceText)
      } else {
        wx.showToast({ title: asrRes.result?.errorMsg || '识别失败', icon: 'none' })
      }
    } catch (err) {
      console.error(err)
      wx.showToast({ title: '识别失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  onManualInput: function(e) {
    this.setData({ manualText: e.detail.value })
  },

  submitManual: async function() {
    if (!this.data.manualText.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' })
      return
    }
    this.submitToAI(this.data.manualText)
  },

  submitToAI: async function(text) {
    this.setData({ loading: true })

    try {
      const userInfo = wx.getStorageSync('userInfo')
      const res = await wx.cloud.callFunction({
        name: 'voiceToRecord',
        data: {
          voiceText: text,
          nickname: userInfo?.nickName || '用户'
        }
      })

      if (res.result?.success) {
        const result = res.result
        wx.showModal({
          title: '记账成功',
          content: `已创建 ${result.count} 条账单\n支出：${result.totalExpense} 元\n收入：${result.totalIncome} 元`,
          showCancel: false,
          success: () => {
            wx.switchTab({ url: '/pages/recordList/recordList' })
          }
        })
      } else {
        wx.showToast({ title: res.result?.errorMsg || '解析失败', icon: 'none' })
      }
    } catch (err) {
      wx.showToast({ title: '提交失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  }
})
