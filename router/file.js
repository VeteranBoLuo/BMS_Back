const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { resultData, snakeCaseKeys, mergeExistingProperties, generateUUID } = require('../util/common');
const pool = require('../db');
const express = require('express');
const commonHandle = require('../router_handle/commonHandle');
const fileHandle = require('../router_handle/fileHandle');
const router = express.Router();

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '/www/wwwroot/files/');
  },
  filename: function (req, file, cb) {
    // 关键步骤：转换中文编码
    const decodedName = Buffer.from(file.originalname, 'latin1').toString('utf-8');
    cb(null, decodedName);
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
    const { mimetype, size, filename, path: filePath } = file;

    // 构建文件的URL
    const directory = `${req.protocol}://${req.get('host')}/files/`;

    // 获取用户信息
    const userId = req.headers['x-user-id'];

    // 准备文件信息
    const fileInfo = {
      create_by: userId,
      create_time: req.requestTime,
      file_name: filename,
      file_type: mimetype,
      file_size: size,
      directory: directory,
    };

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const selectSql = 'SELECT * FROM files WHERE create_by = ? AND file_name = ?';
      const [existingRows] = await connection.query(selectSql, [userId, filename]);

      if (existingRows.length > 0) {
        res.send(resultData('上传成功'));
      } else {
        // 插入文件信息到数据库
        const insertSql = 'INSERT INTO files SET ?';
        const [result] = await connection.query(insertSql, [snakeCaseKeys(fileInfo)]);
        res.send(resultData(result[0]));
      }
      await connection.commit();
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
    const userId = req.headers['x-user-id'];
    const { filters } = req.body;
    const params = [userId];
    // 1. 查询所有该用户创建的文件
    let sql = 'SELECT * FROM files WHERE create_by = ?';
    // 添加文件夹ID条件
    if (filters.folderId !== 'all') {
      sql += ' AND folder_id = ?';
      params.push(filters.folderId);
    }
    sql += ' AND del_flag=0 ORDER BY create_time DESC';
    const [files] = await pool.query(sql, params);

    // 2. 格式化结果
    let formattedFiles = files.map((file) => ({
      id: file.id,
      fileName: file.file_name,
      fileType: file.file_type,
      fileSize: file.file_size,
      fileUrl: file.directory + file.file_name,
      uploadTime: file.create_time,
      folderId: file.folder_id,
    }));

    // 3. 应用文件名过滤
    if (filters?.fileName) {
      formattedFiles = formattedFiles.filter((file) => file.fileName.includes(filters.fileName));
    }

    // 4. 应用文件类型过滤
    if (filters?.type && filters.type.length > 0) {
      // 定义文件类型到 MIME 类型的映射
      const mimeTypeMap = {
        image: ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'],
        pdf: ['application/pdf'],
        word: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        audio: ['audio/mpeg', 'audio/wav'],
        video: ['video/mp4', 'video/quicktime'],
      };

      // 提取用户选择的类型
      const selectedNonOtherTypes = filters.type.filter((t) => t !== 'other');
      const hasOther = filters.type.includes('other');

      // 构建需要包含的 MIME 类型（非 other 类型）
      const includeMimeTypes = selectedNonOtherTypes.flatMap((type) => mimeTypeMap[type] || []);

      // 构建需要排除的 MIME 类型（用于 other 逻辑）
      const excludeMimeTypes = ['image', 'pdf', 'word', 'audio', 'video'].flatMap((type) => mimeTypeMap[type]);

      // 过滤文件
      formattedFiles = formattedFiles.filter((file) => {
        const matchesSelected = includeMimeTypes.includes(file.fileType);
        const matchesOther = hasOther && !excludeMimeTypes.includes(file.fileType);
        return matchesSelected || matchesOther;
      });
    }
    if (filters.type.length === 0) {
      res.send(resultData([]));
    } else {
      res.send(resultData(formattedFiles));
    }
  } catch (error) {
    console.error('查询文件时出错:', error);
    res.send(resultData(null, 500, '服务器内部错误: ' + error.message));
  }
});

// 后端：/downloadFileById 接口
router.post('/downloadFileById', async (req, res) => {
  try {
    const { id } = req.body;

    // 查询文件信息
    const sql = 'SELECT * FROM files WHERE id = ?';
    const [results] = await pool.query(sql, [id]);

    if (results.length === 0) {
      return res.send(resultData(null, 404, '文件未找到'));
    }

    const file = results[0];
    const filePath = path.join('/www/wwwroot/files', file.file_name);

    // 检查文件是否存在
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        return res.send(resultData(null, 404, '文件不存在'));
      }

      // 设置自定义响应头来传递元信息
      res.setHeader('X-File-Name', encodeURIComponent(file.file_name)); // 文件名
      res.setHeader('X-File-Size', file.file_size); // 文件大小
      res.setHeader('X-File-Type', file.file_type); // 文件类型

      // 设置标准的 Content-Disposition 下载头
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.file_name)}"`);

      // 流式传输文件
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    });
  } catch (error) {
    console.error('下载文件时出错:', error);
    res.send(resultData(null, 500, '服务器内部错误')); // 设置状态码为500
  }
});

// 根据id删除文件，同时删除服务器上数据
router.post('/deleteFileById', async (req, res) => {
  try {
    const { id } = req.body;

    // 查询文件信息
    const sql = 'SELECT * FROM files WHERE id = ?';
    const [results] = await pool.query(sql, [id]);

    if (results.length === 0) {
      return res.send(resultData(null, 404, '文件未找到'));
    }

    const file = results[0];
    const filePath = path.join('/www/wwwroot/files', file.file_name);

    // 检查文件是否存在
    fs.access(filePath, fs.constants.F_OK, async (err) => {
      if (err) {
        return res.send(resultData(null, 404, '文件不存在'));
      }

      // 删除数据库中的文件记录
      const deleteSql = 'DELETE FROM files WHERE id = ?';
      await pool.query(deleteSql, [id]);

      // 删除服务器上的文件
      fs.unlinkSync(filePath);

      res.send(resultData({ id }));
    });
  } catch (e) {}
});

// 查询某个人下的文件的总共大小（单位MB）
router.post('/queryTotalFileSize', async (req, res) => {
  try {
    // 获取用户ID
    const userId = req.headers['x-user-id'];

    // 构建SQL查询
    const sql = 'SELECT SUM(file_size) as total_size FROM files WHERE create_by = ?';
    const [result] = await pool.query(sql, [userId]);
    console.log(result[0].total_size / 1024);
    // 提取总大小（MB）保留两位小数
    const totalSizeMB = parseFloat((result[0].total_size / (1024 * 1024)).toFixed(2));
    // 返回结果
    res.send(resultData({ totalSizeMB }));
  } catch (error) {
    // 处理错误
    console.error('查询文件总大小时出错:', error);
    res.send(resultData(null, 500, '服务器内部错误: ' + error.message));
  }
});

router.post('/updateFile', fileHandle.updateFile);

router.post('/queryFolder', fileHandle.queryFolder);
router.post('/addFolder', fileHandle.addFolder);
router.post('/associateFile', fileHandle.associateFile);
router.post('/updateFolder', fileHandle.updateFolder);
router.post('/deleteFolder', fileHandle.deleteFolder);

module.exports = router;
