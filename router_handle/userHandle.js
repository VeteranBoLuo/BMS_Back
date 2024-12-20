const pool = require("../db");
const {resultData, snakeCaseKeys, mergeExistingProperties, getCurrentTimeFormatted} = require("../util/result");

exports.login = (req, res) => {
    try {
        const {userName, password} = req.body;
        const sql = "SELECT * FROM user WHERE user_name = ? AND password = ?";
        pool
            .query(sql, [userName, password])
            .then(async ([result]) => {
                if (result.length === 0) {
                    res.send(resultData(null, 401, "用户名密码错误或已过期，请重新输入")); // 设置状态码为401
                    return;
                }
                const bookmarkTotalSql = `SELECT COUNT(*) FROM bookmark WHERE user_id=? and del_flag = 0`;
                const [bookmarkTotalRes] = await pool.query(bookmarkTotalSql, [result[0].id]);
                const tagTotalSql = `SELECT COUNT(*) FROM tag WHERE user_id=? and del_flag = 0`;
                const [tagTotalRes] = await pool.query(tagTotalSql, [result[0].id]);
                result[0].bookmarkTotal = bookmarkTotalRes[0]["COUNT(*)"];
                result[0].tagTotal = tagTotalRes[0]["COUNT(*)"];
                res.send(resultData(result[0]));
            })
            .catch((err) => {
                res.send(resultData(null, 500, "服务器内部错误: " + err.message)); // 设置状态码为500
            });
    } catch (e) {
        res.send(resultData(null, 400, "客户端请求异常：" + e)); // 设置状态码为400
    }
};

exports.registerUser = (req, res) => {
    try {
        pool
            .query("SELECT * FROM user WHERE user_name = ?", [req.body.userName])
            .then(([result]) => {
                if (result?.length > 0) {
                    res.send(resultData(null, 500, "账号已存在")); // 设置状态码为500
                } else {
                    const params=req.body
                    params.createTime=getCurrentTimeFormatted()
                    pool
                        .query("INSERT INTO user set ?", [snakeCaseKeys(params)])
                        .then(() => {
                            res.send(resultData(null, 200, "注册成功")); // 设置状态码为200
                        });
                }
            })
            .catch((err) => {
                res.send(resultData(null, 500, "服务器内部错误" + err)); // 设置状态码为500
            });
    } catch (e) {
        res.send(resultData(null, 400, "客户端请求异常：" + err)); // 设置状态码为400
    }
};

exports.getUserInfo = (req, res) => {
    try {
        const id = req.headers['x-user-id'] // 获取用户ID
        pool
            .query("SELECT * FROM user WHERE id = ?", [id])
            .then(async ([result]) => {
                if (result.length === 0) {
                    res.send(resultData(null, 401, "用户不存在,请重新登录！")); // 设置状态码为401
                    return;
                }
                const bookmarkTotalSql = `SELECT COUNT(*) FROM bookmark WHERE user_id=? and del_flag = 0`;
                const [bookmarkTotalRes] = await pool.query(bookmarkTotalSql, [id]);
                const tagTotalSql = `SELECT COUNT(*) FROM tag WHERE user_id=? and del_flag = 0`;
                const [tagTotalRes] = await pool.query(tagTotalSql, [id]);
                result[0].bookmarkTotal = bookmarkTotalRes[0]["COUNT(*)"];
                result[0].tagTotal = tagTotalRes[0]["COUNT(*)"];
                res.send(resultData(result[0]));
            })
            .catch((err) => {
                res.send(resultData(null, 500, "服务器内部错误" + err)); // 设置状态码为500
            });
    } catch (e) {
        res.send(resultData(null, 400, "客户端请求异常")); // 设置状态码为400
    }
};
exports.getUserList = (req, res) => {
    try {
        pool
            .query(`SELECT * FROM user where del_flag=0`)
            .then(([result]) => {
                res.send(resultData(result));
            })
            .catch((err) => {
                res.send(resultData(null, 500, "服务器内部错误" + err)); // 设置状态码为500
            });
    } catch (e) {
        res.send(resultData(null, 400, "客户端请求异常")); // 设置状态码为400
    }
};
exports.saveUserInfo = (req, res) => {
    const id =req.body.id?req.body.id: req.headers['x-user-id'] // 获取用户ID
    try {
        pool
            .query("update user set ? where id=?", [
                snakeCaseKeys(mergeExistingProperties(req.body, [], ['id'])),
                id,
            ])
            .then(([result]) => {
                res.send(resultData(result));
            })
            .catch((err) => {
                res.send(resultData(null, 500, "服务器内部错误: " + err.message)); // 设置状态码为500
            });
    } catch (e) {
        res.send(resultData(null, 400, "客户端请求异常：" + e)); // 设置状态码为400
    }
};

exports.deleteUserById = (req, res) => {
    try {
        pool
            .query("update user set del_flag=1 where id=?", [req.query.id])
            .then(([result]) => res.send(resultData(result)))
            .catch((err) =>
                res.send(resultData(null, 500, "服务器内部错误: " + err.message)),
            );
    } catch (e) {
        res.send(resultData(null, 400, "客户端请求异常：" + e)); // 设置状态码为400
    }
};
