App({
  onLaunch: function() {
    if (wx.cloud) {
      wx.cloud.init({
        env: "cloud1-2g7g4n5ff97b444e",
        traceUser: true,
      })
    }
  }
})
