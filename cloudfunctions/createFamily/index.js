// 创建家庭云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  const { familyName } = event
  
  try {
    // 生成家庭 ID（使用时间戳 + 随机数）
    const familyId = `family_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    
    // 创建家庭
    await db.collection('families').add({
      data: {
        familyId,
        familyName,
        creator: OPENID,
        createTime: db.serverDate(),
        memberCount: 1
      }
    })
    
    // 添加创建者为成员
    await db.collection('familyMembers').add({
      data: {
        familyId,
        openid: OPENID,
        role: 'admin',  // admin: 管理员，member: 普通成员
        joinTime: db.serverDate(),
        nickname: event.nickname || '家庭成员'
      }
    })
    
    return {
      success: true,
      familyId,
      msg: '创建成功'
    }
    
  } catch (err) {
    console.error('创建家庭失败', err)
    return {
      success: false,
      errorMsg: err.message
    }
  }
}
