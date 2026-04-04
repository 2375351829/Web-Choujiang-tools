import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '../database.db')

let db = null

export const initDatabase = async () => {
  const SQL = await initSqlJs()

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
    console.log('数据库加载成功')
  } else {
    db = new SQL.Database()
    console.log('新建数据库')
  }

  const createTables = `
    CREATE TABLE IF NOT EXISTS scenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      icon TEXT DEFAULT '🎁',
      description TEXT,
      title TEXT DEFAULT '幸运抽奖',
      background_type TEXT DEFAULT 'gradient',
      background_image TEXT DEFAULT '',
      background_color TEXT DEFAULT '#0f172a',
      gradient_start TEXT DEFAULT '#667eea',
      gradient_end TEXT DEFAULT '#764ba2',
      gradient_degree INTEGER DEFAULT 135,
      theme TEXT DEFAULT 'dark',
      animation_type TEXT DEFAULT 'slot',
      is_default INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scene_id INTEGER,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      avatar TEXT DEFAULT '',
      status TEXT DEFAULT '待审核',
      weight INTEGER DEFAULT 50,
      is_blacklisted INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scene_field_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scene_id INTEGER NOT NULL,
      field_key TEXT NOT NULL,
      field_name TEXT NOT NULL,
      field_type TEXT DEFAULT 'text',
      required INTEGER DEFAULT 0,
      placeholder TEXT,
      default_value TEXT,
      validation_rule TEXT,
      options TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(scene_id, field_key)
    );

    CREATE TABLE IF NOT EXISTS participant_extended_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER NOT NULL,
      field_key TEXT NOT NULL,
      field_value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(participant_id, field_key)
    );

    CREATE TABLE IF NOT EXISTS prizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scene_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT DEFAULT '',
      count INTEGER DEFAULT 1,
      level TEXT DEFAULT '三等奖',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scene_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT '未开始',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS session_participants (
      session_id INTEGER,
      participant_id INTEGER,
      PRIMARY KEY (session_id, participant_id)
    );

    CREATE TABLE IF NOT EXISTS session_prizes (
      session_id INTEGER,
      prize_id INTEGER,
      quantity INTEGER DEFAULT 1,
      PRIMARY KEY (session_id, prize_id)
    );

    CREATE TABLE IF NOT EXISTS draw_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      participant_id INTEGER,
      prize_id INTEGER,
      drawn_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(session_id, participant_id, prize_id)
    );

    CREATE TABLE IF NOT EXISTS lottery_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      current_scene_id INTEGER,
      background_type TEXT DEFAULT 'gradient',
      background_image TEXT DEFAULT '',
      background_color TEXT DEFAULT '#0f172a',
      gradient_start TEXT DEFAULT '#667eea',
      gradient_end TEXT DEFAULT '#764ba2',
      gradient_degree INTEGER DEFAULT 135,
      show_participants INTEGER DEFAULT 1,
      show_prizes INTEGER DEFAULT 1,
      show_winner INTEGER DEFAULT 1,
      carousel_speed INTEGER DEFAULT 3000,
      title TEXT DEFAULT '抽奖活动',
      animation_type TEXT DEFAULT 'slot',
      current_session_id INTEGER,
      theme TEXT DEFAULT 'dark',
      layout_config TEXT DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_participants_name ON participants(name);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_draw_results_session_prize ON draw_results(session_id, prize_id);
    CREATE INDEX IF NOT EXISTS idx_draw_results_participant ON draw_results(participant_id);
    CREATE INDEX IF NOT EXISTS idx_scene_field_configs_scene ON scene_field_configs(scene_id);
    CREATE INDEX IF NOT EXISTS idx_participant_extended_participant ON participant_extended_data(participant_id);
  `

  db.run(createTables)
  console.log('数据库表创建成功')

  initConfig()
  migrateTables()
  insertDefaultScenes()
  insertDefaultSceneFieldConfigs()
  insertTestData()
  saveDatabase()
}

const initConfig = () => {
  const result = db.exec('SELECT COUNT(*) as count FROM lottery_config WHERE id = 1')
  const count = result.length > 0 ? result[0].values[0][0] : 0
  if (count === 0) {
    db.run('INSERT INTO lottery_config (id) VALUES (1)')
    console.log('默认配置已初始化')
  }
}

const migrateTables = () => {
  try {
    let result = db.exec("PRAGMA table_info(participants)")
    let columns = result.length > 0 ? result[0].values.map(row => row[1]) : []
    if (!columns.includes('scene_id')) {
      db.run('ALTER TABLE participants ADD COLUMN scene_id INTEGER')
      console.log('已添加 participants.scene_id 字段')
    }

    result = db.exec("PRAGMA table_info(prizes)")
    columns = result.length > 0 ? result[0].values.map(row => row[1]) : []
    if (!columns.includes('scene_id')) {
      db.run('ALTER TABLE prizes ADD COLUMN scene_id INTEGER')
      console.log('已添加 prizes.scene_id 字段')
    }

    result = db.exec("PRAGMA table_info(sessions)")
    columns = result.length > 0 ? result[0].values.map(row => row[1]) : []
    if (!columns.includes('scene_id')) {
      db.run('ALTER TABLE sessions ADD COLUMN scene_id INTEGER')
      console.log('已添加 sessions.scene_id 字段')
    }

    result = db.exec("PRAGMA table_info(lottery_config)")
    columns = result.length > 0 ? result[0].values.map(row => row[1]) : []
    if (!columns.includes('current_scene_id')) {
      db.run('ALTER TABLE lottery_config ADD COLUMN current_scene_id INTEGER')
      console.log('已添加 lottery_config.current_scene_id 字段')
    }
    if (!columns.includes('background_size')) {
      db.run("ALTER TABLE lottery_config ADD COLUMN background_size TEXT DEFAULT 'cover'")
      console.log('已添加 lottery_config.background_size 字段')
    }
    if (!columns.includes('layout_config')) {
      db.run("ALTER TABLE lottery_config ADD COLUMN layout_config TEXT DEFAULT '{}'")
      console.log('已添加 lottery_config.layout_config 字段')
    }

    db.run('CREATE INDEX IF NOT EXISTS idx_participants_scene ON participants(scene_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_prizes_scene ON prizes(scene_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_sessions_scene ON sessions(scene_id)')
    console.log('场景索引创建成功')
  } catch (err) {
    console.log('数据迁移跳过:', err.message)
  }
}

const insertDefaultScenes = () => {
  const result = db.exec('SELECT COUNT(*) as count FROM scenes')
  const count = result.length > 0 ? result[0].values[0][0] : 0

  if (count === 0) {
    const defaultScenes = [
      ['校园抽奖', 'campus', '🏫', '适用于学校、学院、班级、社团等校园场景', '校园幸运抽奖', '#1e3a5f', '#3b82f6', '#1d4ed8', 1],
      ['公司年会', 'company', '🏢', '适用于公司年会、团建、庆典等企业场景', '年会抽奖', '#7c3aed', '#a855f7', '#6366f1', 0],
      ['社区活动', 'community', '🏘️', '适用于社区、街道、小区等活动场景', '社区幸运抽奖', '#059669', '#10b981', '#34d399', 0],
      ['社团活动', 'club', '🎯', '适用于各类社团、俱乐部、兴趣小组', '社团抽奖', '#dc2626', '#ef4444', '#f87171', 0],
      ['班级活动', 'class', '📚', '适用于班级聚会、活动等场景', '班级幸运抽奖', '#0891b2', '#06b6d4', '#22d3ee', 0],
      ['教职工抽奖', 'faculty', '👨‍🏫', '适用于学校教职工、教师等活动场景', '教职工幸运抽奖', '#ea580c', '#f97316', '#fb923c', 0],
      ['通用抽奖', 'general', '🎁', '适用于各类通用抽奖场景', '幸运抽奖', '#667eea', '#764ba2', '#f093fb', 0]
    ]

    defaultScenes.forEach(s => {
      db.run(`INSERT INTO scenes (name, code, icon, description, title, gradient_start, gradient_end, background_color, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, s)
    })

    db.run('UPDATE lottery_config SET current_scene_id = 1 WHERE id = 1')
    console.log('默认场景插入成功')
  }
}

const insertDefaultSceneFieldConfigs = () => {
  const result = db.exec('SELECT COUNT(*) as count FROM scene_field_configs')
  const count = result.length > 0 ? result[0].values[0][0] : 0

  if (count > 0) return

  const campusFields = [
    [1, 'class_info', '班级信息', 'text', 0, '请输入班级信息，如：2023级1班', '', '', '', 1],
    [1, 'student_id', '学号', 'text', 0, '请输入学号', '', '^[A-Za-z0-9]+$', '', 2],
    [1, 'grade', '年级', 'text', 0, '如：2023级', '', '', '', 3],
    [1, 'counselor_name', '辅导员姓名', 'text', 0, '请输入辅导员姓名', '', '', '{"max_length": 30}', 4],
    [1, 'position', '职务/角色', 'text', 0, '如：班长、学习委员', '', '', '', 5],
    [1, 'college', '学院/学校', 'text', 0, '请输入所属学院/学校', '', '', '', 6],
    [1, 'dormitory', '宿舍号', 'text', 0, '请输入宿舍房间号', '', '', '', 7]
  ]

  const clubFields = [
    [4, 'club_name', '社团名称', 'text', 1, '请输入社团全称', '', '', '', 1],
    [4, 'president_name', '社长姓名', 'text', 0, '请输入社长姓名', '', '', '', 2],
    [4, 'president_phone', '社长电话', 'text', 0, '请输入社长联系方式', '', '', '', 3],
    [4, 'vice_presidents', '副社长信息', 'json', 0, '支持多个副社长', '', '', '', 4],
    [4, 'other_roles', '其他职位', 'json', 0, '其他社团特定职位', '', '', '', 5]
  ]

  const classFields = [
    [5, 'class_info', '班级信息', 'text', 1, '请输入班级信息', '', '', '', 1],
    [5, 'student_id', '学号', 'text', 0, '请输入学号', '', '^[A-Za-z0-9]+$', '', 2],
    [5, 'grade', '年级', 'text', 0, '如：2023级', '', '', '', 3],
    [5, 'position', '职务/角色', 'text', 0, '如：班长、学习委员', '', '', '', 4]
  ]

  const facultyFields = [
    [7, 'employee_id', '工号', 'text', 1, '请输入教职工工号', '', '^[A-Za-z0-9]+$', '', 1],
    [7, 'campus', '校区', 'text', 1, '请输入所在校区', '', '', '', 2],
    [7, 'college', '学院', 'text', 1, '请输入所属学院', '', '', '', 3],
    [7, 'department', '系/教研室', 'text', 0, '请输入所属系或教研室', '', '', '', 4],
    [7, 'position_type', '人员类型', 'select', 1, '请选择人员类型', '', '', '{"options": ["专任教师", "行政人员", "辅导员", "实验员", "后勤人员", "其他"]}', 5],
    [7, 'title', '职称', 'select', 0, '请选择职称', '', '', '{"options": ["教授", "副教授", "讲师", "助教", "高级工程师", "工程师", "助理工程师", "无"]}', 6],
    [7, 'position', '职务', 'text', 0, '如：院长、系主任、教研室主任', '', '', '', 7],
    [7, 'employment_type', '任职方式', 'select', 0, '请选择任职方式', '', '', '{"options": ["全职", "兼职", "外聘", "退休返聘", "其他"]}', 8],
    [7, 'office', '办公室', 'text', 0, '请输入办公室位置', '', '', '', 9],
    [7, 'hire_date', '入职日期', 'date', 0, '请选择入职日期', '', '', '', 10],
    [7, 'teaching_subject', '授课科目', 'text', 0, '请输入主要授课科目', '', '', '', 11],
    [7, 'research_direction', '研究方向', 'text', 0, '请输入研究方向', '', '', '', 12],
    [7, 'education', '学历', 'select', 0, '请选择最高学历', '', '', '{"options": ["博士", "硕士", "本科", "专科", "其他"]}', 13],
    [7, 'degree', '学位', 'select', 0, '请选择最高学位', '', '', '{"options": ["博士", "硕士", "学士", "无"]}', 14]
  ]

  const allFields = [...campusFields, ...clubFields, ...classFields, ...facultyFields]

  allFields.forEach(field => {
    db.run(
      `INSERT INTO scene_field_configs (scene_id, field_key, field_name, field_type, required, placeholder, default_value, validation_rule, options, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      field
    )
  })

  console.log('默认场景字段配置插入成功')
}

const saveDatabase = () => {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  }
}

const insertTestData = () => {
  const result = db.exec('SELECT COUNT(*) as count FROM participants')
  const count = result.length > 0 ? result[0].values[0][0] : 0

  if (count === 0) {
    const allParticipants = []

    const campusParticipants = [
      [1, '张三', 'zhangsan@campus.edu.cn', '13800138001', '', '正常', 50, 0],
      [1, '李四', 'lisi@campus.edu.cn', '13800138002', '', '正常', 60, 0],
      [1, '王五', 'wangwu@campus.edu.cn', '13800138003', '', '待审核', 40, 0],
      [1, '赵六', 'zhaoliu@campus.edu.cn', '13800138004', '', '正常', 70, 0],
      [1, '钱七', 'qianqi@campus.edu.cn', '13800138005', '', '正常', 55, 0],
      [1, '孙八', 'sunba@campus.edu.cn', '13800138006', '', '停用', 30, 1],
      [1, '周九', 'zhoujiu@campus.edu.cn', '13800138007', '', '正常', 45, 0],
      [1, '吴十', 'wushi@campus.edu.cn', '13800138008', '', '正常', 65, 0],
      [1, '郑十一', 'zheng11@campus.edu.cn', '13800138009', '', '待审核', 50, 0],
      [1, '陈十二', 'chen12@campus.edu.cn', '13800138010', '', '正常', 75, 0]
    ]

    const companyParticipants = [
      [2, '刘经理', 'liujl@company.com', '13900139001', '', '正常', 80, 0],
      [2, '陈总监', 'chenzg@company.com', '13900139002', '', '正常', 90, 0],
      [2, '王主管', 'wangzg@company.com', '13900139003', '', '正常', 70, 0],
      [2, '李工程师', 'ligc@company.com', '13900139004', '', '正常', 60, 0],
      [2, '张设计师', 'zhangds@company.com', '13900139005', '', '待审核', 55, 0],
      [2, '赵会计', 'zhaokj@company.com', '13900139006', '', '正常', 50, 0],
      [2, '孙人事', 'sunrs@company.com', '13900139007', '', '正常', 65, 0],
      [2, '周销售', 'zhousales@company.com', '13900139008', '', '正常', 75, 0],
      [2, '吴前台', 'wuqt@company.com', '13900139009', '', '停用', 40, 1],
      [2, '郑司机', 'zhengsj@company.com', '13900139010', '', '正常', 45, 0]
    ]

    const communityParticipants = [
      [3, '王大爷', 'wangdaye@community.cn', '13700137001', '', '正常', 70, 0],
      [3, '李阿姨', 'liayi@community.cn', '13700137002', '', '正常', 65, 0],
      [3, '张叔叔', 'zhangshushu@community.cn', '13700137003', '', '正常', 60, 0],
      [3, '赵大妈', 'zhaodama@community.cn', '13700137004', '', '待审核', 55, 0],
      [3, '刘爷爷', 'liuyeye@community.cn', '13700137005', '', '正常', 80, 0],
      [3, '陈奶奶', 'chennainai@community.cn', '13700137006', '', '正常', 75, 0],
      [3, '孙大哥', 'sundage@community.cn', '13700137007', '', '正常', 50, 0],
      [3, '周大姐', 'zhoudajie@community.cn', '13700137008', '', '停用', 45, 1]
    ]

    const clubParticipants = [
      [4, '林社长', 'linshezhang@club.com', '13600136001', '', '正常', 90, 0],
      [4, '黄副社长', 'huangfusz@club.com', '13600136002', '', '正常', 80, 0],
      [4, '徐秘书', 'xumishu@club.com', '13600136003', '', '正常', 70, 0],
      [4, '马财务', 'macaiwu@club.com', '13600136004', '', '正常', 60, 0],
      [4, '高干事', 'gaoganshi@club.com', '13600136005', '', '待审核', 55, 0],
      [4, '罗成员', 'luochengyuan@club.com', '13600136006', '', '正常', 50, 0],
      [4, '梁成员', 'liangcy@club.com', '13600136007', '', '正常', 45, 0],
      [4, '宋成员', 'songcy@club.com', '13600136008', '', '停用', 40, 1]
    ]

    const classParticipants = [
      [5, '班长小明', 'banzhagn@class.edu', '13500135001', '', '正常', 80, 0],
      [5, '学习委员小红', 'xuexiwy@class.edu', '13500135002', '', '正常', 75, 0],
      [5, '体育委员小刚', 'tiyuwy@class.edu', '13500135003', '', '正常', 70, 0],
      [5, '文艺委员小芳', 'wenyiwy@class.edu', '13500135004', '', '正常', 65, 0],
      [5, '生活委员小华', 'shenghuowy@class.edu', '13500135005', '', '待审核', 60, 0],
      [5, '同学小强', 'xiaoqiang@class.edu', '13500135006', '', '正常', 55, 0],
      [5, '同学小丽', 'xiaoli@class.edu', '13500135007', '', '正常', 50, 0],
      [5, '同学小伟', 'xiaowei@class.edu', '13500135008', '', '正常', 45, 0],
      [5, '同学小梅', 'xiaomei@class.edu', '13500135009', '', '停用', 40, 1],
      [5, '同学小军', 'xiaojun@class.edu', '13500135010', '', '正常', 70, 0]
    ]

    const facultyParticipants = [
      [6, '张教授', 'zhangprof@faculty.edu', '13400134001', '', '正常', 95, 0],
      [6, '李副教授', 'liaoprof@faculty.edu', '13400134002', '', '正常', 85, 0],
      [6, '王讲师', 'wangjiangshi@faculty.edu', '13400134003', '', '正常', 75, 0],
      [6, '赵辅导员', 'zhaofudao@faculty.edu', '13400134004', '', '正常', 70, 0],
      [6, '刘行政', 'liuxingzheng@faculty.edu', '13400134005', '', '待审核', 65, 0],
      [6, '陈实验员', 'chenshiyan@faculty.edu', '13400134006', '', '正常', 60, 0],
      [6, '孙后勤', 'sunhouqin@faculty.edu', '13400134007', '', '正常', 55, 0],
      [6, '周工程师', 'zhougongcheng@faculty.edu', '13400134008', '', '正常', 80, 0],
      [6, '吴助教', 'wuzhujiao@faculty.edu', '13400134009', '', '停用', 50, 1],
      [6, '郑外聘', 'zhengwaipin@faculty.edu', '13400134010', '', '正常', 60, 0]
    ]

    const generalParticipants = [
      [7, '参与者A', 'userA@general.com', '13300133001', '', '正常', 60, 0],
      [7, '参与者B', 'userB@general.com', '13300133002', '', '正常', 55, 0],
      [7, '参与者C', 'userC@general.com', '13300133003', '', '待审核', 50, 0],
      [7, '参与者D', 'userD@general.com', '13300133004', '', '正常', 70, 0],
      [7, '参与者E', 'userE@general.com', '13300133005', '', '正常', 65, 0],
      [7, '参与者F', 'userF@general.com', '13300133006', '', '停用', 40, 1],
      [7, '参与者G', 'userG@general.com', '13300133007', '', '正常', 75, 0],
      [7, '参与者H', 'userH@general.com', '13300133008', '', '正常', 80, 0]
    ]

    allParticipants.push(
      ...campusParticipants,
      ...companyParticipants,
      ...communityParticipants,
      ...clubParticipants,
      ...classParticipants,
      ...facultyParticipants,
      ...generalParticipants
    )

    allParticipants.forEach(p => {
      db.run('INSERT INTO participants (scene_id, name, email, phone, avatar, status, weight, is_blacklisted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', p)
    })

    const allPrizes = []

    const campusPrizes = [
      [1, '奖学金5000元', '优秀学生奖学金', '', 1, '特等奖'],
      [1, '平板电脑', '学习用平板电脑', '', 2, '一等奖'],
      [1, '蓝牙耳机', '高品质蓝牙耳机', '', 5, '二等奖'],
      [1, '文具套装', '精美文具礼盒', '', 10, '三等奖'],
      [1, '笔记本', '精美笔记本', '', 30, '参与奖']
    ]

    const companyPrizes = [
      [2, '年终大奖', '现金红包10000元', '', 1, '特等奖'],
      [2, 'iPhone 15 Pro', '苹果最新手机', '', 2, '一等奖'],
      [2, 'AirPods Pro', '苹果无线耳机', '', 5, '二等奖'],
      [2, '京东卡500元', '京东购物卡', '', 10, '三等奖'],
      [2, '精美礼品', '公司定制礼品', '', 20, '参与奖']
    ]

    const communityPrizes = [
      [3, '智能电饭煲', '高品质电饭煲', '', 1, '特等奖'],
      [3, '空气净化器', '家用空气净化器', '', 2, '一等奖'],
      [3, '超市购物卡200元', '社区超市购物卡', '', 5, '二等奖'],
      [3, '生活用品套装', '日常生活用品', '', 10, '三等奖'],
      [3, '纪念品', '社区纪念品', '', 30, '参与奖']
    ]

    const clubPrizes = [
      [4, '社团基金1000元', '社团活动基金', '', 1, '特等奖'],
      [4, '运动手环', '智能运动手环', '', 2, '一等奖'],
      [4, '社团定制T恤', '限量版社团T恤', '', 5, '二等奖'],
      [4, '社团徽章套装', '精美徽章', '', 10, '三等奖'],
      [4, '社团纪念品', '小礼品', '', 20, '参与奖']
    ]

    const classPrizes = [
      [5, '班级奖学金', '班级优秀奖励', '', 1, '特等奖'],
      [5, '学习平板', '学习用平板电脑', '', 1, '一等奖'],
      [5, '书籍礼盒', '精选图书套装', '', 3, '二等奖'],
      [5, '文具套装', '精美文具', '', 5, '三等奖'],
      [5, '小礼品', '班级小礼品', '', 15, '参与奖']
    ]

    const facultyPrizes = [
      [6, '优秀教师奖', '荣誉证书+奖金5000元', '', 1, '特等奖'],
      [6, '笔记本电脑', '办公笔记本电脑', '', 2, '一等奖'],
      [6, '智能手表', '健康智能手表', '', 3, '二等奖'],
      [6, '办公用品套装', '高品质办公用品', '', 5, '三等奖'],
      [6, '纪念品', '教职工纪念品', '', 10, '参与奖']
    ]

    const generalPrizes = [
      [7, '神秘大奖', '惊喜大奖', '', 1, '特等奖'],
      [7, '智能音箱', 'AI智能音箱', '', 2, '一等奖'],
      [7, '充电宝', '大容量充电宝', '', 5, '二等奖'],
      [7, '定制水杯', '精美水杯', '', 10, '三等奖'],
      [7, '小礼品', '参与小礼品', '', 20, '参与奖']
    ]

    allPrizes.push(
      ...campusPrizes,
      ...companyPrizes,
      ...communityPrizes,
      ...clubPrizes,
      ...classPrizes,
      ...facultyPrizes,
      ...generalPrizes
    )

    allPrizes.forEach(p => {
      db.run('INSERT INTO prizes (scene_id, name, description, image_url, count, level) VALUES (?, ?, ?, ?, ?, ?)', p)
    })

    const allSessions = []

    const campusSessions = [
      [1, '校园文化节抽奖', '2024年校园文化节抽奖活动', '未开始'],
      [1, '毕业季抽奖', '2024届毕业生抽奖活动', '未开始'],
      [1, '迎新抽奖', '2024级新生迎新抽奖', '未开始']
    ]

    const companySessions = [
      [2, '年会抽奖', '2024年公司年会抽奖活动', '未开始'],
      [2, '季度团建抽奖', '第一季度团建抽奖', '未开始'],
      [2, '员工生日会抽奖', '月度员工生日会抽奖', '未开始']
    ]

    const communitySessions = [
      [3, '春节联欢抽奖', '2024年春节社区联欢抽奖', '未开始'],
      [3, '中秋活动抽奖', '中秋节社区活动抽奖', '未开始'],
      [3, '国庆活动抽奖', '国庆节社区活动抽奖', '未开始']
    ]

    const clubSessions = [
      [4, '社团招新抽奖', '2024年社团招新抽奖活动', '未开始'],
      [4, '社团周年庆抽奖', '社团成立周年庆抽奖', '未开始'],
      [4, '社团活动抽奖', '社团日常活动抽奖', '未开始']
    ]

    const classSessions = [
      [5, '班级聚会抽奖', '班级学期聚会抽奖活动', '未开始'],
      [5, '期末抽奖', '期末班级抽奖活动', '未开始'],
      [5, '节日抽奖', '班级节日庆祝抽奖', '未开始']
    ]

    const facultySessions = [
      [6, '教师节抽奖', '2024年教师节庆祝抽奖', '未开始'],
      [6, '年终总结抽奖', '教职工年终总结抽奖', '未开始'],
      [6, '工会活动抽奖', '教职工工会活动抽奖', '未开始']
    ]

    const generalSessions = [
      [7, '日常抽奖', '日常抽奖活动', '未开始'],
      [7, '节日抽奖', '节日特别抽奖', '未开始'],
      [7, '周年庆抽奖', '周年庆典抽奖', '未开始']
    ]

    allSessions.push(
      ...campusSessions,
      ...companySessions,
      ...communitySessions,
      ...clubSessions,
      ...classSessions,
      ...facultySessions,
      ...generalSessions
    )

    allSessions.forEach(s => {
      db.run('INSERT INTO sessions (scene_id, name, description, status) VALUES (?, ?, ?, ?)', s)
    })

    const sessionParticipantsData = [
      [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 10],
      [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [2, 8], [2, 9], [2, 10],
      [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8],
      [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7], [4, 8],
      [5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [5, 6], [5, 7], [5, 8], [5, 9], [5, 10],
      [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6], [6, 7], [6, 8], [6, 9], [6, 10],
      [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [7, 7], [7, 8]
    ]

    sessionParticipantsData.forEach(([sessionId, participantIdx]) => {
      const participantId = getSessionParticipantId(sessionId, participantIdx)
      db.run('INSERT INTO session_participants (session_id, participant_id) VALUES (?, ?)', [sessionId, participantId])
    })

    const sessionPrizesData = [
      [1, 1, 1], [1, 2, 2], [1, 3, 5],
      [2, 6, 1], [2, 7, 2], [2, 8, 5],
      [3, 11, 1], [3, 12, 2], [3, 13, 5],
      [4, 16, 1], [4, 17, 2], [4, 18, 5],
      [5, 21, 1], [5, 22, 2], [5, 23, 5],
      [6, 26, 1], [6, 27, 2], [6, 28, 5],
      [7, 31, 1], [7, 32, 2], [7, 33, 5]
    ]

    sessionPrizesData.forEach(([sessionId, prizeId, quantity]) => {
      db.run('INSERT INTO session_prizes (session_id, prize_id, quantity) VALUES (?, ?, ?)', [sessionId, prizeId, quantity])
    })

    db.run('UPDATE lottery_config SET current_session_id = 1, current_scene_id = 1 WHERE id = 1')

    console.log('测试数据插入成功 - 已为所有场景添加测试数据')
    saveDatabase()
  }
}

const getSessionParticipantId = (sessionId, participantIdx) => {
  const offsets = [0, 10, 20, 28, 36, 46, 56, 64]
  const sceneId = Math.ceil(sessionId / 3) || 1
  const baseOffset = offsets[sceneId] || 0
  return baseOffset + participantIdx
}

export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      const result = db.exec(sql, params)
      if (result.length === 0) {
        resolve([])
      } else {
        const columns = result[0].columns
        const values = result[0].values.map(row => {
          const obj = {}
          columns.forEach((col, i) => {
            obj[col] = row[i]
          })
          return obj
        })
        resolve(values)
      }
    } catch (err) {
      reject(err)
    }
  })
}

export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      db.run(sql, params)
      const lastId = db.exec('SELECT last_insert_rowid() as id')
      resolve({ lastID: lastId[0].values[0][0], changes: db.getRowsModified() })
      saveDatabase()
    } catch (err) {
      reject(err)
    }
  })
}

export const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      const result = db.exec(sql, params)
      if (result.length === 0 || result[0].values.length === 0) {
        resolve(null)
      } else {
        const columns = result[0].columns
        const row = result[0].values[0]
        const obj = {}
        columns.forEach((col, i) => {
          obj[col] = row[i]
        })
        resolve(obj)
      }
    } catch (err) {
      reject(err)
    }
  })
}

export default { initDatabase, query, run, get }
