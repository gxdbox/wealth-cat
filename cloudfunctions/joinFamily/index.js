// 加入家庭云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  const { familyId, nickname } = event
  
  try {
    // 检查家庭是否存在
    const familyRes = await db.collection('families')
      .where({ familyId })
      .get()
    
    if (familyRes.data.length === 0) {
      return {
        success: false,
        errorMsg: '家庭不存在'
      }
    }
    
    // 检查是否已是成员
    const memberRes = await db.collection('familyMembers')
      .where({
        familyId,
        openid: OPENID
      })
      .get()
    
    if (memberRes.data.length > 0) {
      return {
        success: false,
        errorMsg: '你已是家庭成员'
      }
    }
    
    // 添加成员
    await db.collection('familyMembers').add({
      data: {
        familyId,
        openid: OPENID,
        role: 'member',
        joinTime: db.serverDate(),
        nickname: nickname || '家庭成员'
      }
    })
    
    // 更新家庭人数
    await db.collection('families')
      .where({ familyId })
      .update({
        data: {
          memberCount: db.command.inc(1)
        }
      })
    
    return {
      success: true,
      familyName: familyRes.data[0].familyName,
      msg: '加入成功'
    }
    
  } catch (err) {
    console.error('加入家庭失败', err)
    return {
      success: false,
      errorMsg: err.message
    }
  }
}
