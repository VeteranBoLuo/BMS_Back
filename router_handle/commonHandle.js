const {
  resultData,
  convertISOToDatabaseFormat,
  getCurrentTimeFormatted,
  snakeCaseKeys,
} = require("../util/result");
const https = require("https");
const pool = require("../db");

exports.getApiLogs = (req, res) => {
  try {
    const { filters, pageSize, currentPage } = req.body;
    const skip = pageSize * (currentPage - 1);
    let sql =
      "SELECT * FROM api_logs where (user_name LIKE CONCAT('%', ?, '%') OR url LIKE CONCAT('%', ?, '%')) AND del_flag=0 ORDER BY request_time DESC LIMIT ? OFFSET ?";
    pool
      .query(sql, [filters.key, filters.key, pageSize, skip])
      .then(async ([result]) => {
        result.forEach((row) => {
          // 判断row.res是否是JSON字符串
          if (typeof row.res === "string") {
            try {
              row.res = JSON.parse(row.res);
            } catch (e) {
              // 如果解析失败，保持原样或者根据需要处理
              console.error("Error parsing res:", e);
            }
          }
          // 判断row.req是否是JSON字符串
          if (typeof row.req === "string") {
            try {
              row.req = JSON.parse(row.req);
            } catch (e) {
              // 如果解析失败，保持原样或者根据需要处理
              console.error("Error parsing req:", e);
            }
          }
        });
        const [totalRes] = await pool.query(
          "SELECT COUNT(*) FROM api_logs where (user_name LIKE CONCAT('%', ?, '%') OR url LIKE CONCAT('%', ?, '%')) AND del_flag=0 ",
          [filters.key, filters.key],
        );
        res.send(
          resultData({
            items: result,
            total: totalRes[0]["COUNT(*)"],
          }),
        );
      });
  } catch (e) {
    res.send(resultData(null, 400, "客户端请求异常" + e)); // 设置状态码为400
  }
};
exports.clearApiLogs = (req, res) => {
  try {
    pool
      .query("UPDATE api_logs set del_flag=1")
      .then(() => {
        res.send(resultData(null));
      })
      .catch((err) => {
        res.send(resultData(null, 500, "服务器内部错误: " + err.message)); // 设置状态码为500
      });
  } catch (e) {
    res.send(resultData(null, 400, "客户端请求异常" + e)); // 设置状态码为400
  }
};

// 用户操作日志
exports.addOperationLogs = (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const log = {
      createBy: userId,
      createTime: getCurrentTimeFormatted(),
      ...req.body,
      os: req.headers.os,
      browser: req.headers["browser"],
      del_flag: 0,
    };
    pool
      .query("INSERT INTO operation_logs SET ?", [snakeCaseKeys(log)])
      .then(() => {
        res.send(resultData(null));
      })
      .catch((err) => {
        res.send(resultData(null, 500, "服务器内部错误: " + err.message)); // 设置状态码为500
      });
  } catch (e) {
    res.send(resultData(null, 400, "客户端请求异常" + e)); // 设置状态码为400
  }
};

exports.getOperationLogs = (req, res) => {
  try {
    const { filters, pageSize, currentPage } = req.body;
    const skip = pageSize * (currentPage - 1);
    // 查询总数据条数
    pool
      .query(
        `SELECT o.*, u.user_name
FROM operation_logs o
LEFT JOIN user u ON o.create_by = u.id
WHERE (u.user_name LIKE CONCAT('%', ?, '%') 
OR o.operation LIKE CONCAT('%', ?, '%') 
OR o.module LIKE CONCAT('%', ?, '%')) 
AND o.del_flag = 0
ORDER BY o.create_time DESC
LIMIT ? OFFSET ?;
`,
        [filters.key, filters.key, filters.key, pageSize, skip],
      )
      .then(async ([result]) => {
        const totalSql = `SELECT COUNT(*) FROM operation_logs o left join user u on o.create_by=u.id WHERE 
(u.user_name LIKE CONCAT('%', ?, '%') 
OR o.operation LIKE CONCAT('%', ?, '%') 
OR o.module LIKE CONCAT('%', ?, '%'))
AND o.del_flag=0`;
        const [totalRes] = await pool.query(totalSql, [
          filters.key,
          filters.key,
          filters.key,
        ]);
        res.send(
          resultData({
            items: result,
            total: totalRes[0]["COUNT(*)"],
          }),
        );
      })
      .catch((err) => {
        res.send(resultData(null, 500, "服务器内部错误: " + err.message)); // 设置状态码为500
      });
  } catch (e) {
    res.send(resultData(null, 400, "客户端请求异常" + e)); // 设置状态码为400
  }
};

exports.clearOperationLogs = (req, res) => {
  try {
    pool
      .query("UPDATE operation_logs set del_flag=1")
      .then(() => {
        res.send(resultData(null));
      })
      .catch((err) => {
        res.send(resultData(null, 500, "服务器内部错误: " + err.message)); // 设置状态码为500
      });
  } catch (e) {
    res.send(resultData(null, 400, "客户端请求异常" + e)); // 设置状态码为400
  }
};

exports.analyzeImgUrl = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const promises = req.body.map(async (bookmark) => {
      if (bookmark.noCache) {
        return new Promise((resolve, reject) => {
          const fileBuffer = [];
          https
            .get(
              "https://icon.bqb.cool/?url=" + encodeURIComponent(bookmark.url),
              (response) => {
                const contentType = response.headers["content-type"];
                response.on("data", (chunk) => {
                  fileBuffer.push(chunk);
                });
                response.on("end", async () => {
                  const base64Image =
                    Buffer.concat(fileBuffer).toString("base64");
                  const dataURI = `data:${contentType};base64,${base64Image}`;
                  const insertIconUrlSql = `UPDATE bookmark SET icon_url=? WHERE id=?`;
                  try {
                    await connection.query(insertIconUrlSql, [
                      dataURI,
                      bookmark.id,
                    ]);
                    resolve();
                  } catch (err) {
                    reject(err);
                  }
                });
              },
            )
            .on("error", (err) => {
              console.error("Error downloading file:", err);
              reject(err);
            });
        });
      }
    });

    // 等待所有的Promise都完成
    await Promise.all(promises);

    // 发送成功响应给前端
    res.send(resultData(null, 200, "所有图标已更新成功"));
  } catch (err) {
    // 如果发生错误，发送错误响应给前端
    res.send(resultData(null, 500, "服务器内部错误: " + err.message));
  } finally {
    connection.release(); // 释放连接
  }
};
