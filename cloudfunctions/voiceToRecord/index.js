// 语音转记账云函数
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// DeepSeek API 配置
const DEEPSEEK_API_KEY = 'sk-2cea34be614c4d50b54a95471b0c00f0'

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  const { voiceText } = event  // 语音识别后的文字
  
  try {
    console.log('用户语音输入:', voiceText)
    
    // 调用 AI 解析语音内容
    const parseResult = await parseVoiceText(voiceText)
    
    console.log('AI 解析结果:', parseResult)
    
    // 如果解析成功，保存到数据库
    if (parseResult && parseResult.amount) {
      const recordData = {
        type: parseResult.type || 'expense',
        amount: parseFloat(parseResult.amount),
        note: parseResult.note || voiceText,
        category: parseResult.category || 'other',
        date: parseResult.date || new Date().toISOString().split('T')[0],
        createTime: db.serverDate(),
        openid: OPENID,
        nickname: event.nickname || '用户',
        fromVoice: true  // 标记来自语音
      }
      
      await db.collection('records').add({
        data: recordData
      })
      
      return {
        success: true,
        message: `已记录：${parseResult.type === 'expense' ? '支出' : '收入'} ${parseResult.amount}元`,
        data: recordData
      }
    } else {
      return {
        success: false,
        errorMsg: '未能识别金额，请再说清楚一点，例如："买咖啡花了 35 元"'
      }
    }
    
  } catch (err) {
    console.error('语音记账失败', err)
    return {
      success: false,
      errorMsg: err.message
    }
  }
}

// 调用 AI 解析语音文字
function parseVoiceText(text) {
  return new Promise((resolve, reject) => {
    const systemPrompt = `你是一个语音记账解析助手。用户会说出消费内容，请你提取以下信息：
- type: 支出或收入（expense 或 income）
- amount: 金额（数字）
- category: 分类（food/transport/shopping/entertainment/health/education/life/other）
- note: 备注描述
- date: 日期（如果没有特别说明，用今天）

示例：
"今天早上买咖啡花了 35 元" → {"type":"expense","amount":35,"category":"food","note":"买咖啡","date":"today"}
"昨天打车花了 50 块" → {"type":"expense","amount":50,"category":"transport","note":"打车","date":"yesterday"}
"今天收到工资 8000 元" → {"type":"income","amount":8000,"category":"salary","note":"工资","date":"today"}

只返回 JSON，不要其他内容。`

    const postData = JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请解析这句话："${text}"` }
      ],
      temperature: 0.3,
      max_tokens: 200
    })
    
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
      
      res.on('data', (chunk) => {
        responseData += chunk
      })
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData)
          if (result.choices && result.choices[0]) {
            const content = result.choices[0].message.content
            // 提取 JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              resolve(JSON.parse(jsonMatch[0]))
            } else {
              resolve({ success: false })
            }
          } else {
            resolve({ success: false })
          }
        } catch (err) {
          reject(err)
        }
      })
    })
    
    req.on('error', (err) => {
      reject(err)
    })
    
    req.write(postData)
    req.end()
  })
}
