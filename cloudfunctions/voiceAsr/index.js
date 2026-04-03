// 语音识别云函数 - 接入微信官方 ASR
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  const { fileID } = event  // 云存储文件 ID
  
  try {
    console.log('开始语音识别，fileID:', fileID)
    
    // 调用微信语音识别 API
    const asrRes = await cloud.openapi.speech.voiceToText({
      media: {
        contentType: 'audio/mp3',
        value: Buffer.from(fileID)  // 需要先从云存储下载
      },
      mode: 'VOICEOTF'  // 实时识别
    })
    
    console.log('语音识别结果:', asrRes)
    
    if (asrRes.result && asrRes.result.text) {
      const voiceText = asrRes.result.text
      console.log('识别文字:', voiceText)
      
      return {
        success: true,
        voiceText: voiceText
      }
    } else {
      return {
        success: false,
        errorMsg: '识别失败，请重试'
      }
    }
    
  } catch (err) {
    console.error('语音识别失败', err)
    return {
      success: false,
      errorMsg: err.message
    }
  }
}
