const pool = require('../db');
const fs = require('fs').promises;
const path = require('path');
const { snakeCaseKeys, resultData, mergeExistingProperties } = require('../util/common');
exports.addNote = (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const params = {
      ...req.body,
      createBy: userId,
      createTime: req.requestTime,
      updateTime: req.requestTime,
    };
    pool
      .query('INSERT INTO note SET ?', [snakeCaseKeys(params)])
      .then(() => {
        pool
          .query('SELECT id FROM note ORDER BY create_time DESC LIMIT 1')
          .then(([noteRes]) => {
            res.send(
              resultData({
                id: noteRes[0]['id'],
              }),
            );
          })
          .catch((err) => {
            res.send(resultData(null, 500, '服务器内部错误: ' + err.message)); // 设置状态码为500
          });
      })
      .catch((err) => {
        res.send(resultData(null, 500, '服务器内部错误: ' + err.message)); // 设置状态码为500
      });
  } catch (e) {
    res.send(resultData(null, 400, '客户端请求异常' + e)); // 设置状态码为400
  }
};
exports.updateNote = (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const params = {
      ...req.body,
      updateBy: userId,
      updateTime: req.requestTime,
    };
    pool
      .query('update note set ? where id=?', [snakeCaseKeys(mergeExistingProperties(params, [], ['id'])), req.body.id])
      .then(() => {
        res.send(resultData('更新笔记成功'));
      })
      .catch((err) => {
        res.send(resultData(null, 500, '服务器内部错误: ' + err.message)); // 设置状态码为500
      });
  } catch (e) {
    res.send(resultData(null, 400, '客户端请求异常' + e)); // 设置状态码为400
  }
};
exports.queryNoteList = (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    pool
      .query('select * from note where create_by=? and del_flag=0 ORDER BY update_time DESC', [userId])
      .then(([result]) => {
        res.send(resultData(result));
      })
      .catch((err) => {
        res.send(resultData(null, 500, '服务器内部错误: ' + err.message)); // 设置状态码为500
      });
  } catch (e) {
    res.send(resultData(null, 400, '客户端请求异常' + e)); // 设置状态码为400
  }
};
exports.getNoteDetail = (req, res) => {
  try {
    pool
      .query('select * from note where id=?', [req.body.id])
      .then(([result]) => {
        res.send(resultData(result[0]));
      })
      .catch((err) => {
        res.send(resultData(null, 500, '服务器内部错误: ' + err.message)); // 设置状态码为500
      });
  } catch (e) {
    res.send(resultData(null, 400, '客户端请求异常' + e)); // 设置状态码为400
  }
};

exports.delNote = async (req, res) => {
  try {
    const ids = req.body.ids; // 获取标签ID数组
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.send(resultData(null, 400, '无效的请求参数'));
    }

    const sql = `UPDATE note SET del_flag=1 WHERE id IN (?)`;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction(); // 开始事务

      // 批量更新笔记的 del_flag
      const [updateResult] = await connection.query(sql, [ids]);

      // 查询所有关联的图片URLs
      const selectImagesSql = `SELECT url FROM note_images WHERE note_id IN (?)`;
      const [images] = await connection.query(selectImagesSql, [ids]);
      // 删除笔记关联的图片记录
      const deleteAssociationsSql = `DELETE FROM note_images WHERE note_id IN (?)`;
      await connection.query(deleteAssociationsSql, [ids]);

      // 删除服务器上的图片文件
      const deletePromises = images.map(async (image) => {
        // 替换URL中的代理路径为实际文件路径
        const filePath = image.url.replace(
          new RegExp(`^${req.protocol}://${req.get('host')}/uploads/`),
          '/www/wwwroot/images/',
        );
        try {
          console.log('delete filePath', filePath);
          await fs.unlink(filePath);
        } catch (e) {
          console.error(`删除文件 ${filePath} 时出错: ${e.message}`);
        }
      });

      // 等待所有文件删除操作完成
      await Promise.all(deletePromises);

      await connection.commit(); // 提交事务

      res.send(resultData(updateResult));
    } catch (error) {
      await connection.rollback(); // 回滚事务
      res.send(resultData(null, 500, '服务器内部错误: ' + error.message)); // 设置状态码为500
    } finally {
      connection.release(); // 释放连接
    }
  } catch (e) {
    res.send(resultData(null, 400, '客户端请求异常: ' + e.message)); // 设置状态码为400
  }
};
