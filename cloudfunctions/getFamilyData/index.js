// 获取家庭数据云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  
  try {
    // 获取用户加入的家庭
    const memberRes = await db.collection('familyMembers')
      .where({ openid: OPENID })
      .get()
    
    if (memberRes.data.length === 0) {
      return {
        success: true,
        hasFamily: false,
        msg: '未加入家庭'
      }
    }
    
    const familyId = memberRes.data[0].familyId
    const userRole = memberRes.data[0].role
    
    // 获取家庭信息
    const familyRes = await db.collection('families')
      .where({ familyId })
      .get()
    
    // 获取家庭成员
    const membersRes = await db.collection('familyMembers')
      .where({ familyId })
      .get()
    
    // 获取家庭账单记录
    const recordsRes = await db.collection('records')
      .where({ familyId })
      .orderBy('createTime', 'desc')
      .get()
    
    // 统计数据
    let totalExpense = 0
    let totalIncome = 0
    
    recordsRes.data.forEach(record => {
      if (record.type === 'expense') {
        totalExpense += record.amount
      } else {
        totalIncome += record.amount
      }
    })
    
    return {
      success: true,
      hasFamily: true,
      family: familyRes.data[0],
      members: membersRes.data,
      records: recordsRes.data,
      userRole,
      stats: {
        totalExpense: totalExpense.toFixed(2),
        totalIncome: totalIncome.toFixed(2),
        balance: (totalIncome - totalExpense).toFixed(2),
        recordCount: recordsRes.data.length
      }
    }
    
  } catch (err) {
    console.error('获取家庭数据失败', err)
    return {
      success: false,
      errorMsg: err.message
    }
  }
}
