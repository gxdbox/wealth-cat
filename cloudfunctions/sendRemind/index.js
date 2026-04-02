// 云函数入口函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    // 发送订阅消息
    await cloud.openapi.subscribeMessage.send({
      touser: event.openid,  // 接收者 openid
      page: event.page || 'pages/profile/profile',  // 点击消息跳转页面
      data: event.data,  // 消息内容
      templateId: event.templateId  // 消息模板 ID
    })
    
    return {
      success: true,
      msg: '发送成功'
    }
    
  } catch (err) {
    console.error('发送失败', err)
    return {
      success: false,
      errorMsg: err.message
    }
  }
}
