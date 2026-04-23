// 腾讯云语音识别云函数
const cloud = require('wx-server-sdk')
const tencentcloud = require('tencentcloud-sdk-nodejs')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const AsrClient = tencentcloud.asr.v20190614.Client

// 腾讯云配置
const SECRETID = 'REMOVED_SECRET_ID'
const SECRETKEY = 'REMOVED_SECRET_KEY'
const REGION = 'ap-guangzhou'  // 广州

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { fileID } = event
  
  console.log('=== 开始语音识别 ===')
  console.log('REGION:', REGION)
  console.log('fileID:', fileID)
  
  try {
    console.log('开始从云存储下载文件...')
    
    // 从云存储下载录音文件
    const fileRes = await cloud.getTempFileURL({
      fileList: [fileID]
    })
    
    console.log('云存储返回:', JSON.stringify(fileRes, null, 2))
    
    if (!fileRes.fileList || fileRes.fileList.length === 0) {
      return {
        success: false,
        errorMsg: '文件不存在'
      }
    }
    
    const tempURL = fileRes.fileList[0].tempFileURL
    console.log('临时下载链接:', tempURL)
    
    // 创建腾讯云 ASR 客户端
    const client = new AsrClient({
      credential: {
        secretId: SECRETID,
        secretKey: SECRETKEY
      },
      region: REGION,
      profile: {
        httpProfile: {
          endpoint: "asr.tencentcloudapi.com"
        }
      }
    })
    
    // 调用语音识别接口
    const params = {
      EngSerViceType: "16k_zh",  // 16k 中文通用（必需）
      SourceType: 0,  // 0: URL 方式（必需）
      VoiceFormat: "mp3",  // 音频格式（必需）
      Url: tempURL  // 音频文件 URL
    }
    
    console.log('调用腾讯云 ASR，参数:', params)
    
    const asrRes = await client.SentenceRecognition(params)
    
    console.log('识别结果:', asrRes)
    
    if (asrRes.Result) {
      return {
        success: true,
        voiceText: asrRes.Result,
        resultDetail: asrRes
      }
    } else {
      return {
        success: false,
        errorMsg: '识别结果为空'
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
