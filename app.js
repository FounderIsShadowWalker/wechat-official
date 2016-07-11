'use strict';
var express = require('express');
var timeout = require('connect-timeout');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var todos = require('./routes/todos');
var AV = require('leanengine');

var crypto = require('crypto')
var wechat = require('wechat')
var request = require('request')

var user = require('./routes/user.js')


var app = express();

// 设置模板引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static('public'));

// 设置默认超时时间
app.use(timeout('15s'));

// 加载云函数定义
require('./cloud');
// 加载云引擎中间件
app.use(AV.express());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.query())

var config = require('./config.js')

var access_token

getAccessToken()
  .then(function(res){
    res = JSON.parse(res)
    console.log('access_token获取成功，开始服务')
    access_token = res.access_token
    // createMenu()

    setTimeout(function(){
      getAccessToken()
    }, 7000 * 1000)
  })

app.use('/wechat', wechat(config, handle))
app.use(user)

app.use(function(req, res, next) {
  // 如果任何一个路由都没有返回响应，则抛出一个 404 异常给后续的异常处理器
  if (!res.headersSent) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  }
});

// error handlers
app.use(function(err, req, res, next) { // jshint ignore:line
  var statusCode = err.status || 500;
  if(statusCode === 500) {
    console.error(err.stack || err);
  }
  if(req.timedout) {
    console.error('请求超时: url=%s, timeout=%d, 请确认方法执行耗时很长，或没有正确的 response 回调。', req.originalUrl, err.timeout);
  }
  res.status(statusCode);
  // 默认不输出异常详情
  var error = {}
  if (app.get('env') === 'development') {
    // 如果是开发环境，则将异常堆栈输出到页面，方便开发调试
    error = err;
  }
  res.render('error', {
    message: err.message,
    error: error
  });
});

function handle(req, res){
  console.log('消息接口验证已通过')
  switch (req.weixin.MsgType) {
    case 'text':
      console.log('收到文字信息')
      robot(req.weixin.Content)
        .then(function(response){
          res.reply(JSON.parse(response).text)
        })
        .catch(function(error){
          res.reply('我好像出了点问题')
        })
      break
    case 'event':
      console.log(req.weixin)
      break
    default:
      console.log('???')
      res.reply('我好像出了点问题')
      break
  }
}

function getAccessToken(){
  var options = {
    url: `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.appid}&secret=${config.secret}`
  }
  return new Promise(function(resolve, reject){
    request(options, function(err, res, body){
      if(!err){
        resolve(body)
      }else{
        reject(err)
      }
    })
  })
}

function robot(content){
  var options = {
    url: `http://apis.baidu.com/turing/turing/turing?key=879a6cb3afb84dbf4fc84a1df2ab7319&info=${content.toString()}`,
    headers: {
      apikey: config.apikey
    }
  }
  return new Promise(function(resolve, reject) {
    request(options, function(err, response, body){
      if(response){
        resolve(body)
      }else{
        reject(err)
      }
    })
  })
}

function createMenu(){
  var menus = {
    "button": [
        {
            "name": "我的博客", 
            "type": "view",
            "url": "http://www.showonne.com"
        }, {
          "name": "todolist", 
          "type": "view",
          "url": `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${config.appid}&redirect_uri=http%3A%2F%2F9jthfkkri1.proxy.qqbrowser.cc%2Fuser&response_type=code&scope=snsapi_userinfo&state=showonne#wechat_redirect`
        }
    ]
  }
  var options = {
    url: `https://api.weixin.qq.com/cgi-bin/menu/create?access_token=${access_token}`,
    form: JSON.stringify(menus),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }

  request.post(options, function(err, response, body){
    body = JSON.parse(body)
    if(!body.errcode){
      console.log('创建菜单成功')
    }else{
      console.log('创建菜单失败', body.errcode, body.errmsg)
    }
  })
}


module.exports = app;
