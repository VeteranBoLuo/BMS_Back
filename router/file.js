const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { resultData, snakeCaseKeys, mergeExistingProperties, generateUUID } = require('../util/common');
const pool = require('../db');
const express = require('express');
const router = express.Router();

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '/www/wwwroot/upload');
  },
  filename: function (req, file, cb) {
    // 关键步骤：转换中文编码
    const decodedName = Buffer.from(file.originalname, 'latin1').toString('utf-8');
    const uniqueSuffix = Date.now();
    cb(null, 'note-' + uniqueSuffix + '-' + decodedName);
  },
});

const fileFilter = (req, file, cb) => {
  // 允许所有文件类型
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 限制文件大小为100MB
  },
});

router.post('/uploadFile', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.send(resultData(null, 400, '没有上传文件'));
    }

    // 获取文件信息
    const file = req.file;
    const { originalname, mimetype, size, filename, path: filePath } = file;

    // 构建文件的URL
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;

    // 获取用户信息
    const userId = req.headers['x-user-id'];

    // 准备文件信息
    const fileInfo = {
      create_by: userId,
      create_time: req.requestTime,
      file_name: originalname,
      file_type: mimetype,
      file_size: size,
      file_path: filename,
      url: fileUrl,
    };

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 插入文件信息到数据库
      const insertSql = 'INSERT INTO files SET ?';
      const [result] = await connection.query(insertSql, [snakeCaseKeys(fileInfo)]);

      await connection.commit();
      res.send(resultData(result[0]));
    } catch (error) {
      await connection.rollback();
      // 删除上传的文件
      if (file) {
        try {
          fs.unlinkSync(filePath);
          console.log(`文件 ${filePath} 已删除。`);
        } catch (deleteError) {
          console.error(`删除文件 ${filePath} 时出错: ${deleteError.message}`);
        }
      }
      res.send(resultData(null, 500, '服务器内部错误: ' + error.message));
    } finally {
      connection.release();
    }
  } catch (e) {
    res.send(resultData(null, 500, '服务器内部错误: ' + e.message));
  }
});

// 查询所有文件
router.post('/queryFiles', async (req, res) => {
  try {
    // 获取用户ID
    const userId = req.headers['x-user-id'];

    // 构建SQL查询
    const sql = 'SELECT * FROM files WHERE create_by = ?';
    const [files] = await pool.query(sql, [userId]);

    // 格式化结果
    const formattedFiles = files.map((file) => ({
      fileId: file.id,
      fileName: file.file_name,
      fileType: file.file_type,
      fileSize: file.file_size,
      fileUrl: file.url,
      uploadTime: file.create_time,
    }));

    // 返回结果
    res.send(resultData(formattedFiles));
  } catch (error) {
    // 处理错误
    console.error('查询文件时出错:', error);
    res.send(resultData(null, 500, '服务器内部错误: ' + error.message));
  }
});

module.exports = router;
