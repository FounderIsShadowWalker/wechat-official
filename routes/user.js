var router = require('express').Router()
var request = require('request')

var config = require('../config.js')

router.get('/user', function(req, res, next){
    console.log('user route get~')
    console.log(req)
    var code = req.query.code
    var options = {
        url: `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${config.appid}&secret=${config.secret}&code=${code}&grant_type=authorization_code`
    }

    request.get(options, function(err, response, body){
        if(err){
            console.log(err)
        }else{
            var body = JSON.parse(body)
            var access_token = body.access_token,
                openid = body.openid

            request(`https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`, function(err, response, body){
                if(err){
                    console.log('err!!!')
                }else{
                    var body = JSON.parse(body)
                    console.log('userinfo:', body)
                    res.render('user', {info: body})
                }
            })
        }
    })
})

module.exports = router