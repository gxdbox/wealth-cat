// 云函数入口函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取当前用户 openid
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  
  try {
    // 查询当前用户的所有记录
    const records = await db.collection('records')
      .where({
        _openid: OPENID  // 只查询当前用户的数据
      })
      .get()
    
    // 统计数据
    let totalExpense = 0
    let totalIncome = 0
    const categoryStats = {}
    
    records.data.forEach(record => {
      // 统计收支
      if (record.type === 'expense') {
        totalExpense += record.amount
      } else {
        totalIncome += record.amount
      }
      
      // 按分类统计
      if (!categoryStats[record.category]) {
        categoryStats[record.category] = 0
      }
      categoryStats[record.category] += record.amount
    })
    
    return {
      success: true,
      data: {
        totalExpense: totalExpense.toFixed(2),
        totalIncome: totalIncome.toFixed(2),
        balance: (totalIncome - totalExpense).toFixed(2),
        categoryStats,
        recordCount: records.data.length
      }
    }
    
  } catch (err) {
    console.error(err)
    return {
      success: false,
      errorMsg: err.message
    }
  }
}
