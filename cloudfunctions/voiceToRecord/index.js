// 语音转记账云函数
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// DeepSeek API 配置 - 从环境变量读取
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-2cea34be614c4d50b54a95471b0c00f0'

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
    if (parseResult && parseResult.records && parseResult.records.length > 0) {
      const records = parseResult.records
      const savedRecords = []

      // 遍历每条记录写入数据库
      for (const record of records) {
        const recordData = {
          type: record.type || 'expense',
          amount: parseFloat(record.amount),
          note: record.note || '',
          category: record.category || 'other',
          date: record.date || new Date().toISOString().split('T')[0],
          createTime: db.serverDate(),
          openid: OPENID,
          nickname: event.nickname || '用户',
          fromVoice: true
        }

        await db.collection('records').add({
          data: recordData
        })

        savedRecords.push(recordData)
      }

      // 计算汇总
      const totalExpense = savedRecords
        .filter(r => r.type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0)
      const totalIncome = savedRecords
        .filter(r => r.type === 'income')
        .reduce((sum, r) => sum + r.amount, 0)

      return {
        success: true,
        message: `已记录 ${savedRecords.length} 条账单：支出 ${totalExpense} 元，收入 ${totalIncome} 元`,
        records: savedRecords,
        count: savedRecords.length,
        totalExpense,
        totalIncome
      }
    } else {
      return {
        success: false,
        errorMsg: '未能识别金额，请再说清楚一点，例如："早餐鸡蛋3元、面包5元"'
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
    const systemPrompt = `你是一个语音记账解析助手。用户会说出一天的消费和收入内容，请你解析并按类别分组。

规则：
1. 同一类别的多项消费合并为一条记录（如早餐的鸡蛋、面包、馄饨合并为一条"餐饮"记录）
2. 不同类别的消费分开记录
3. 收入和支出分开记录
4. 计算合并后的总金额

分类映射：
- 餐饮(food): 早餐、午餐、晚餐、零食、饮料等
- 交通(transport): 打车、公交、地铁、加油等
- 购物(shopping): 衣服、裤子、鞋、日用品等
- 娱乐(entertainment): 电影、游戏、旅游等
- 医疗(health): 看病、买药等
- 教育(education): 书籍、培训、学费等
- 生活(life): 房租、水电、孝敬长辈、礼物红包等
- 工资(salary): 工资收入
- 奖金(bonus): 红包、奖金、补贴等
- 投资(investment): 投资收益
- 兼职(parttime): 兼职收入
- 其他(other): 无法归类的

返回格式：
{
  "records": [
    {"type": "expense/income", "amount": 数字, "category": "分类代码", "note": "备注描述"}
  ]
}

示例：
输入："早餐鸡蛋3元、面包5元、馄饨7元，收到领导红包29元，买裤子89元、衣服23元，给奶奶红包200元"
输出：
{
  "records": [
    {"type": "expense", "amount": 15, "category": "food", "note": "早餐（鸡蛋3元、面包5元、馄饨7元）"},
    {"type": "income", "amount": 29, "category": "bonus", "note": "领导红包"},
    {"type": "expense", "amount": 112, "category": "shopping", "note": "裤子89元、衣服23元"},
    {"type": "expense", "amount": 200, "category": "life", "note": "给奶奶红包"}
  ]
}

只返回 JSON，不要其他内容。`

    const postData = JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请解析这句话："${text}"` }
      ],
      temperature: 0.3,
      max_tokens: 500
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
            console.log('AI 返回内容:', content)
            // 提取 JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              resolve(JSON.parse(jsonMatch[0]))
            } else {
              resolve({ records: [] })
            }
          } else {
            resolve({ records: [] })
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