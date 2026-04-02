// 云函数入口函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  return {
    openid: wxContext.OPENID,  // 当前用户的 openid
    appid: wxContext.APPID,    // 小程序 AppID
    unionid: wxContext.UNIONID // 微信开放平台 unionid（如已绑定）
  }
}
