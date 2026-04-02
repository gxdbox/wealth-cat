// 云函数入口函数
exports.main = async (event, context) => {
  const { city } = event
  
  // 模拟天气数据
  const weatherData = {
    beijing: { temp: 25, condition: '晴' },
    shanghai: { temp: 28, condition: '多云' },
    guangzhou: { temp: 32, condition: '小雨' },
    shenzhen: { temp: 30, condition: '阴' }
  }
  
  const weather = weatherData[city] || { temp: 26, condition: '未知' }
  
  return {
    city: city,
    temperature: weather.temp,
    condition: weather.condition,
    time: new Date().toLocaleString()
  }
}
