const userRouter = require("./router/user");
const commonRouter = require("./router/common");
const documentRouter = require("./router/document");
const bookmarkRouter = require("./router/bookmark");
const bodyParser = require("body-parser");

// 建立一个Express服务器
const express = require("express");
const pool = require("./db");
const {getCurrentTimeFormatted, snakeCaseKeys} = require("./util/result");
const app = express();
app.use(bodyParser.json({limit: "10mb", extended: true}));
// 缓存中间件，为所有响应设置Cache-Control头
// app.use((req, res, next) => {
//     res.set('Cache-Control', 'public, max-age=3600'); // 缓存1小时
//     next();
// });

//  解析请求体中的JSON数据
app.use(express.json());
// 日志记录中间件
app.use(async (req, res, next) => {
    // 登录接口调用时还没有userID和角色权限等信息，需要查询获取
    if (req.originalUrl.includes('login')) {
        const {userName, password} = req.body;
        const [userResult] = await pool.query("SELECT * FROM user WHERE user_name = ? AND password = ?", [
            userName, password,
        ]);
        req.headers['x-user-id'] = userResult[0].id;
        // 角色为游客，需要查询获取
    } else if (req.headers.role === 'visitor') {
        const [visitorResult] = await pool.query('SELECT id FROM user WHERE role = ?', ['visitor']);
        req.headers['x-user-id'] = visitorResult[0].id;
    }
    const userId = req.headers["x-user-id"];
    let skipUser = false;
    if (userId) {
        skipUser = ["453c9c95-9b2e-11ef-9d4d-84a93e80c16e"].some((key) =>
            userId.includes(key),
        );
    }
    const skipApi = [
        "Logs",
        "getUserInfo",
        "getUserList",
        "analyzeImgUrl",
        "getRelatedTag",
    ].some((key) => req.originalUrl.includes(key));

    if (skipApi || skipUser) {
        next();
        return;
    }
    const requestPayload = JSON.stringify(
        req.method === "GET" ? req.query : req.body,
    );
    // 创建一个变量来存储响应体
    let responsePayload;
    // 捕获原始响应发送函数
    const originalSend = res.send;
    // 重写 send 函数来捕获响应体
    res.send = function (body) {
        responsePayload = body;
        originalSend.call(this, body);
    };
    // 等待响应结束
    res.on("finish", async () => {
        if (userId) {
            try {
                // 查询用户信息
                const [result] = await pool.query("SELECT * FROM user WHERE id = ?", [
                    userId,
                ]);
                // 构造日志对象
                const log = {
                    userId: userId,
                    userName: result[0]?.user_name,
                    method: req.method,
                    url: req.originalUrl,
                    req: requestPayload === "{}" ? "" : requestPayload,
                    res: responsePayload,
                    os: req.headers.os,
                    browser: req.headers["browser"],
                    requestTime: getCurrentTimeFormatted(), // 获取当前时间
                    del_flag: 0,
                };
                // 将日志保存到数据库
                const query = "INSERT INTO api_logs SET ?";
                pool.query(query, [snakeCaseKeys(log)]).catch((err) => {
                    console.error("日志更新错误错误: " + err.message);
                });
            } catch (err1) {
                console.error("日志更新错误错误：", err1);
            }
        }
    });
    next();
});

app.use("/user", userRouter);
app.use("/common", commonRouter);
app.use("/document", documentRouter);
app.use("/bookmark", bookmarkRouter);

//  启动服务器
app.listen(9001, () => {
    console.log("服务器已启动， 监听端口9001");
});
