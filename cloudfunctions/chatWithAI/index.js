// AI 对话云函数 - 接入 DeepSeek 大模型
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// DeepSeek API 配置
const DEEPSEEK_API_KEY = 'sk-2cea34be614c4d50b54a95471b0c00f0'
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  const { message, conversationId } = event
  
  try {
    // 获取用户的历史账单数据（用于 AI 分析）
    const recordsRes = await db.collection('records')
      .where({ openid: OPENID })
      .orderBy('createTime', 'desc')
      .limit(50)
      .get()
    
    // 构建上下文信息
    const userData = {
      totalRecords: recordsRes.data.length,
      recentRecords: recordsRes.data.slice(0, 10).map(r => ({
        type: r.type,
        amount: r.amount,
        category: r.category,
        note: r.note,
        date: r.date
      }))
    }
    
    // 构建系统提示词
    const systemPrompt = `你是一个智能记账助手，帮助用户分析消费数据、提供理财建议。
    
当前用户的消费数据：
${JSON.stringify(userData, null, 2)}

请用简洁、友好的中文回复。涉及金额时用"元"作为单位。
如果用户询问账单相关问题，基于以上数据回答。
如果用户问的是其他问题，正常回答即可。`

    // 调用 DeepSeek API
    const aiResponse = await callDeepSeekAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ])
    
    console.log('AI 回复成功:', aiResponse)
    
    // 保存对话记录（可选）
    if (conversationId) {
      await db.collection('ai_conversations').add({
        data: {
          openid: OPENID,
          conversationId,
          userMessage: message,
          aiResponse: aiResponse,
          createTime: db.serverDate()
        }
      })
    }
    
    return {
      success: true,
      message: aiResponse
    }
    
  } catch (err) {
    console.error('AI 对话失败', err)
    return {
      success: false,
      errorMsg: err.message
    }
  }
}

// 调用 DeepSeek API
function callDeepSeekAPI(messages) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'deepseek-chat',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000
    })
    
    console.log('调用 DeepSeek API，请求数据:', postData)
    
    const options = {
      hostname: 'api.deepseek.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    }
    
    const req = https.request(options, (res) => {
      let responseData = ''
      
      console.log('API 响应状态码:', res.statusCode)
      
      res.on('data', (chunk) => {
        responseData += chunk
      })
      
      res.on('end', () => {
        try {
          console.log('API 完整响应:', responseData)
          const result = JSON.parse(responseData)
          
          // 检查是否有错误
          if (result.error) {
            console.error('API 返回错误:', result.error)
            reject(new Error(result.error.message || 'API 错误'))
          } else if (result.choices && result.choices[0]) {
            resolve(result.choices[0].message.content)
          } else {
            reject(new Error('API 返回格式错误'))
          }
        } catch (err) {
          console.error('解析响应失败:', err, '原始数据:', responseData)
          reject(err)
        }
      })
    })
    
    req.on('error', (err) => {
      console.error('请求失败:', err)
      reject(err)
    })
    
    req.write(postData)
    req.end()
  })
}
