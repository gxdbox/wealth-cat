// 更新记录云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  const { action, recordId, data } = event

  try {
    if (action === 'update') {
      // 更新记录
      const updateData = {
        type: data.type,
        amount: parseFloat(data.amount),
        category: data.category,
        note: data.note || '',
        date: data.date  // 保持字符串格式
      }

      const result = await db.collection('records').doc(recordId).update({
        data: updateData
      })

      return {
        success: true,
        message: '更新成功',
        updated: result.stats.updated
      }
    } else if (action === 'delete') {
      // 删除记录
      const result = await db.collection('records').doc(recordId).remove()

      return {
        success: true,
        message: '删除成功',
        removed: result.stats.removed
      }
    } else {
      return {
        success: false,
        errorMsg: '未知操作类型'
      }
    }
  } catch (err) {
    console.error('操作失败', err)
    return {
      success: false,
      errorMsg: err.message
    }
  }
}