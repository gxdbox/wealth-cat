const app = getApp()

Page({
  data: {
    isRecording: false,
    recognizeResult: '',
    manualText: '',
    loading: false,
    recorderManager: null
  },

  onLoad: function() {
    // 获取录音管理器
    this.setData({
      recorderManager: wx.getRecorderManager()
    })

    // 监听录音事件
    this.data.recorderManager.onStart(() => {
      console.log('录音开始')
    })

    this.data.recorderManager.onStop((res) => {
      console.log('录音停止', res)
      this.handleRecordEnd(res.tempFilePath)
    })

    this.data.recorderManager.onError((err) => {
      console.error('录音错误', err)
      wx.showToast({ title: '录音失败', icon: 'none' })
      this.setData({ isRecording: false })
    })
  },

  // 开始录音
  startRecord: function() {
    this.setData({ isRecording: true })

    this.data.recorderManager.start({
      duration: 60000,  // 最长 60 秒
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3'
    })
  },

  // 停止录音
  stopRecord: function() {
    this.setData({ isRecording: false })
    this.data.recorderManager.stop()
  },

  // 录音结束处理
  handleRecordEnd: async function(filePath) {
    this.setData({ loading: true })

    try {
      // 上传录音文件到云存储
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: 'voice/' + Date.now() + '.mp3',
        filePath: filePath
      })

      console.log('文件上传成功，fileID:', uploadRes.fileID)

      // 调用腾讯云语音识别云函数
      const asrRes = await wx.cloud.callFunction({
        name: 'voiceAsrTencent',
        data: {
          fileID: uploadRes.fileID
        }
      })

      if (asrRes.result && asrRes.result.success) {
        const voiceText = asrRes.result.voiceText
        console.log('识别文字:', voiceText)

        // 显示识别结果
        this.setData({
          recognizeResult: `识别结果：${voiceText}`,
          manualText: voiceText
        })

        // 自动提交到 AI 解析
        await this.submitToAI(voiceText)
      } else {
        wx.showToast({ 
          title: asrRes.result?.errorMsg || '识别失败', 
          icon: 'none' 
        })
      }

    } catch (err) {
      console.error(err)
      wx.showToast({ title: '识别失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 手动输入
  onManualInput: function(e) {
    this.setData({ manualText: e.detail.value })
  },

  // 提交手动输入
  submitManual: async function() {
    if (!this.data.manualText.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' })
      return
    }
    this.submitToAI(this.data.manualText)
  },

  // 提交到 AI 解析
  submitToAI: async function(text) {
    this.setData({ loading: true })

    try {
      const openid = wx.getStorageSync('openid')
      const userInfo = wx.getStorageSync('userInfo')

      // 调用云函数解析文字
      const res = await wx.cloud.callFunction({
        name: 'voiceToRecord',
        data: {
          voiceText: text,
          nickname: userInfo ? userInfo.nickName : '用户'
        }
      })

      if (res.result.success) {
        wx.showToast({ title: '记账成功', icon: 'success' })
        this.setData({
          recognizeResult: res.result.message,
          manualText: '',
          loading: false
        })

        // 1 秒后跳转到账单页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/recordList/recordList'
          })
        }, 1000)
      } else {
        wx.showToast({ title: res.result.errorMsg || '解析失败', icon: 'none' })
        this.setData({ loading: false })
      }
    } catch (err) {
      console.error(err)
      wx.showToast({ title: '提交失败', icon: 'none' })
      this.setData({ loading: false })
    }
  }
})
