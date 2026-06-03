/**
 * 我的密码模块 Excel 导出工具
 */

import { PASSWORD_CATEGORY_OPTIONS } from '../../src/constants/passwordCategories';
import { formatChinaDateTime, formatSqliteUtcToChinaDateTime } from '../../src/utils/dateTime';
import type { PasswordItemRow } from './database';

const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const INVALID_SHEET_NAME_PATTERN = /[\\/:?*\[\]]/g;
const INVALID_XML_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;
const UTF8_FILENAME_FLAG = 0x0800;

interface PasswordExportColumn {
  key:
    | 'title'
    | 'category'
    | 'login_url'
    | 'login_method'
    | 'account'
    | 'password'
    | 'phone'
    | 'email'
    | 'remark'
    | 'updated_at';
  label: string;
  width: number;
}

interface WorkbookSheet {
  name: string;
  rows: string[][];
}

interface ZipFileEntry {
  name: string;
  data: Buffer;
}

export interface PasswordExportFile {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}

const PASSWORD_EXPORT_COLUMNS: readonly PasswordExportColumn[] = [
  { key: 'title', label: '平台名称', width: 22 },
  { key: 'category', label: '分类', width: 14 },
  { key: 'login_url', label: '登录网址', width: 34 },
  { key: 'login_method', label: '登录方式', width: 16 },
  { key: 'account', label: '登录账号', width: 24 },
  { key: 'password', label: '登录密码', width: 22 },
  { key: 'phone', label: '手机号', width: 18 },
  { key: 'email', label: '邮箱', width: 28 },
  { key: 'remark', label: '备注', width: 40 },
  { key: 'updated_at', label: '更新时间', width: 22 }
] as const;

const crc32Table = new Uint32Array(256);

for (let index = 0; index < crc32Table.length; index += 1) {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  crc32Table[index] = value >>> 0;
}

/**
 * 生成密码导出文件
 * @param items - 密码记录列表
 * @param exportedAt - 导出时间
 * @returns xlsx 文件内容与文件名
 * @throws 不主动抛出异常
 */
export const createPasswordExportFile = (
  items: PasswordItemRow[],
  exportedAt: Date = new Date()
): PasswordExportFile => {
  const workbookSheets = createWorkbookSheets(items);
  const resolvedSheetNames = createUniqueSheetNames(workbookSheets.map((sheet) => sheet.name));
  const zipEntries: ZipFileEntry[] = [
    {
      name: '[Content_Types].xml',
      data: Buffer.from(createContentTypesXml(resolvedSheetNames.length), 'utf8')
    },
    {
      name: '_rels/.rels',
      data: Buffer.from(createRootRelationshipsXml(), 'utf8')
    },
    {
      name: 'xl/workbook.xml',
      data: Buffer.from(createWorkbookXml(resolvedSheetNames), 'utf8')
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: Buffer.from(createWorkbookRelationshipsXml(resolvedSheetNames.length), 'utf8')
    },
    {
      name: 'xl/styles.xml',
      data: Buffer.from(createStylesXml(), 'utf8')
    }
  ];

  workbookSheets.forEach((sheet, index) => {
    zipEntries.push({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: Buffer.from(createWorksheetXml(sheet.rows), 'utf8')
    });
  });

  const fileStamp = formatChinaDateTime(exportedAt).replace(/[-: ]/g, '') || `${Date.now()}`;

  return {
    buffer: createZipArchive(zipEntries),
    contentType: XLSX_MIME_TYPE,
    fileName: `我的密码-${fileStamp}.xlsx`
  };
};

/**
 * 构建工作簿 Sheet 数据
 * @param items - 密码记录列表
 * @returns 按分类分组后的 Sheet 定义
 * @throws 不主动抛出异常
 */
const createWorkbookSheets = (items: PasswordItemRow[]): WorkbookSheet[] => {
  const headerRow = PASSWORD_EXPORT_COLUMNS.map((column) => column.label);

  if (items.length === 0) {
    return [
      {
        name: '我的密码',
        rows: [headerRow]
      }
    ];
  }

  const groupedItems = new Map<string, PasswordItemRow[]>();

  for (const item of items) {
    const category = normalizeCategory(item.category);
    const categoryItems = groupedItems.get(category);

    if (categoryItems) {
      categoryItems.push(item);
      continue;
    }

    groupedItems.set(category, [item]);
  }

  const orderedCategories = getOrderedCategories(groupedItems);

  return orderedCategories.map((category) => ({
    name: category,
    rows: [
      headerRow,
      ...groupedItems.get(category)!.map((item) => PASSWORD_EXPORT_COLUMNS.map((column) => getCellText(item, column.key)))
    ]
  }));
};

/**
 * 读取单元格文本
 * @param item - 密码记录
 * @param key - 字段名
 * @returns 导出的文本内容
 * @throws 不主动抛出异常
 */
const getCellText = (item: PasswordItemRow, key: PasswordExportColumn['key']): string => {
  if (key === 'updated_at') {
    return formatSqliteUtcToChinaDateTime(item.updated_at);
  }

  const value = item[key];

  if (typeof value !== 'string') {
    return '';
  }

  return value;
};

/**
 * 规范化分类名
 * @param value - 原始分类
 * @returns 分类名
 * @throws 不抛出异常
 */
const normalizeCategory = (value: string | null | undefined): string => {
  const normalizedValue = value?.trim();
  return normalizedValue || '其他';
};

/**
 * 获取导出时的分类排序
 * @param groupedItems - 分类分组
 * @returns 已排序的分类名列表
 * @throws 不抛出异常
 */
const getOrderedCategories = (groupedItems: Map<string, PasswordItemRow[]>): string[] => {
  const categories = [...groupedItems.keys()];
  const builtInCategorySet = new Set<string>(PASSWORD_CATEGORY_OPTIONS);
  const builtInCategories = PASSWORD_CATEGORY_OPTIONS.filter((category) => groupedItems.has(category));
  const customCategories = categories
    .filter((category) => !builtInCategorySet.has(category))
    .sort((left, right) => left.localeCompare(right, 'zh-CN'));

  return [...builtInCategories, ...customCategories];
};

/**
 * 创建工作簿主 XML
 * @param sheetNames - Sheet 名称列表
 * @returns workbook.xml 内容
 * @throws 不抛出异常
 */
const createWorkbookXml = (sheetNames: string[]): string => {
  const sheetXml = sheetNames
    .map((sheetName, index) => `<sheet name="${escapeXml(sheetName)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join('');

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '  <bookViews>',
    '    <workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/>',
    '  </bookViews>',
    `  <sheets>${sheetXml}</sheets>`,
    '</workbook>'
  ].join('');
};

/**
 * 创建工作簿关系 XML
 * @param sheetCount - Sheet 数量
 * @returns workbook.xml.rels 内容
 * @throws 不抛出异常
 */
const createWorkbookRelationshipsXml = (sheetCount: number): string => {
  const sheetRelationshipXml = Array.from({ length: sheetCount }, (_, index) => {
    return `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`;
  }).join('');
  const stylesRelationshipId = sheetCount + 1;

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    `  ${sheetRelationshipXml}`,
    `  <Relationship Id="rId${stylesRelationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`,
    '</Relationships>'
  ].join('');
};

/**
 * 创建根关系 XML
 * @returns _rels/.rels 内容
 * @throws 不抛出异常
 */
const createRootRelationshipsXml = (): string => {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>',
    '</Relationships>'
  ].join('');
};

/**
 * 创建 Content Types XML
 * @param sheetCount - Sheet 数量
 * @returns [Content_Types].xml 内容
 * @throws 不抛出异常
 */
const createContentTypesXml = (sheetCount: number): string => {
  const worksheetOverrides = Array.from({ length: sheetCount }, (_, index) => {
    return `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
  }).join('');

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '  <Default Extension="xml" ContentType="application/xml"/>',
    '  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    '  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
    `  ${worksheetOverrides}`,
    '</Types>'
  ].join('');
};

/**
 * 创建样式 XML
 * @returns styles.xml 内容
 * @throws 不抛出异常
 */
const createStylesXml = (): string => {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    '  <fonts count="2">',
    '    <font><sz val="11"/><name val="Microsoft YaHei"/><family val="2"/></font>',
    '    <font><b/><sz val="11"/><name val="Microsoft YaHei"/><family val="2"/><color rgb="FF1F2D3D"/></font>',
    '  </fonts>',
    '  <fills count="3">',
    '    <fill><patternFill patternType="none"/></fill>',
    '    <fill><patternFill patternType="gray125"/></fill>',
    '    <fill><patternFill patternType="solid"><fgColor rgb="FFEFF4FF"/><bgColor indexed="64"/></patternFill></fill>',
    '  </fills>',
    '  <borders count="1">',
    '    <border><left/><right/><top/><bottom/><diagonal/></border>',
    '  </borders>',
    '  <cellStyleXfs count="1">',
    '    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>',
    '  </cellStyleXfs>',
    '  <cellXfs count="2">',
    '    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
    '    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>',
    '  </cellXfs>',
    '  <cellStyles count="1">',
    '    <cellStyle name="Normal" xfId="0" builtinId="0"/>',
    '  </cellStyles>',
    '</styleSheet>'
  ].join('');
};

/**
 * 创建单个 Sheet XML
 * @param rows - 行数据
 * @returns worksheet.xml 内容
 * @throws 不抛出异常
 */
const createWorksheetXml = (rows: string[][]): string => {
  const rowCount = rows.length;
  const columnCount = PASSWORD_EXPORT_COLUMNS.length;
  const colsXml = PASSWORD_EXPORT_COLUMNS
    .map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`)
    .join('');
  const hasDataRows = rowCount > 1;
  const sheetViewsXml = hasDataRows
    ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>'
    : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
  const rowXml = rows.map((row, rowIndex) => {
    const cellXml = row.map((cellValue, columnIndex) => {
      const cellReference = `${toColumnName(columnIndex)}${rowIndex + 1}`;
      const styleAttribute = rowIndex === 0 ? ' s="1"' : '';

      return `<c r="${cellReference}" t="inlineStr"${styleAttribute}><is><t xml:space="preserve">${escapeXml(cellValue)}</t></is></c>`;
    }).join('');

    return `<row r="${rowIndex + 1}">${cellXml}</row>`;
  }).join('');

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    `  <dimension ref="A1:${toColumnName(columnCount - 1)}${rowCount}"/>`,
    `  ${sheetViewsXml}`,
    '  <sheetFormatPr defaultRowHeight="18"/>',
    `  <cols>${colsXml}</cols>`,
    `  <sheetData>${rowXml}</sheetData>`,
    '</worksheet>'
  ].join('');
};

/**
 * 创建唯一 Sheet 名称
 * @param sheetNames - 原始 Sheet 名称列表
 * @returns 唯一且合法的 Sheet 名称列表
 * @throws 不抛出异常
 */
const createUniqueSheetNames = (sheetNames: string[]): string[] => {
  const usedNames = new Set<string>();

  return sheetNames.map((sheetName) => {
    const normalizedName = sanitizeSheetName(sheetName);
    let candidate = normalizedName;
    let suffixIndex = 1;

    while (usedNames.has(candidate)) {
      const suffix = `-${suffixIndex}`;
      candidate = `${truncateByCodePoint(normalizedName, 31 - suffix.length)}${suffix}`;
      suffixIndex += 1;
    }

    usedNames.add(candidate);
    return candidate;
  });
};

/**
 * 规范化 Sheet 名称
 * @param value - 原始 Sheet 名称
 * @returns 合法 Sheet 名称
 * @throws 不抛出异常
 */
const sanitizeSheetName = (value: string): string => {
  const sanitizedValue = value
    .replace(INVALID_SHEET_NAME_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return truncateByCodePoint(sanitizedValue || '密码列表', 31);
};

/**
 * 按 Unicode 码点截断文本
 * @param value - 原始文本
 * @param maxLength - 最大长度
 * @returns 截断后的文本
 * @throws 不抛出异常
 */
const truncateByCodePoint = (value: string, maxLength: number): string => {
  return Array.from(value).slice(0, Math.max(maxLength, 0)).join('');
};

/**
 * 转义 XML 文本
 * @param value - 原始文本
 * @returns XML 安全文本
 * @throws 不抛出异常
 */
const escapeXml = (value: string): string => {
  return value
    .replace(INVALID_XML_CHAR_PATTERN, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

/**
 * 将列序号转换为 Excel 列名
 * @param index - 从 0 开始的列序号
 * @returns Excel 列名
 * @throws 不抛出异常
 */
const toColumnName = (index: number): string => {
  let current = index + 1;
  let columnName = '';

  while (current > 0) {
    const remainder = (current - 1) % 26;
    columnName = String.fromCharCode(65 + remainder) + columnName;
    current = Math.floor((current - 1) / 26);
  }

  return columnName;
};

/**
 * 创建 Zip 压缩包
 * @param entries - 文件条目
 * @returns Zip 二进制内容
 * @throws 不抛出异常
 */
const createZipArchive = (entries: ZipFileEntry[]): Buffer => {
  const zipParts: Buffer[] = [];
  const centralDirectoryParts: Buffer[] = [];
  let localFileOffset = 0;

  for (const entry of entries) {
    const fileNameBuffer = Buffer.from(entry.name, 'utf8');
    const entryData = entry.data;
    const { dosTime, dosDate } = toDosDateTime(new Date());
    const checksum = crc32(entryData);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(UTF8_FILENAME_FLAG, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(entryData.length, 18);
    localHeader.writeUInt32LE(entryData.length, 22);
    localHeader.writeUInt16LE(fileNameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    zipParts.push(localHeader, fileNameBuffer, entryData);

    const centralDirectoryHeader = Buffer.alloc(46);
    centralDirectoryHeader.writeUInt32LE(0x02014b50, 0);
    centralDirectoryHeader.writeUInt16LE(20, 4);
    centralDirectoryHeader.writeUInt16LE(20, 6);
    centralDirectoryHeader.writeUInt16LE(UTF8_FILENAME_FLAG, 8);
    centralDirectoryHeader.writeUInt16LE(0, 10);
    centralDirectoryHeader.writeUInt16LE(dosTime, 12);
    centralDirectoryHeader.writeUInt16LE(dosDate, 14);
    centralDirectoryHeader.writeUInt32LE(checksum, 16);
    centralDirectoryHeader.writeUInt32LE(entryData.length, 20);
    centralDirectoryHeader.writeUInt32LE(entryData.length, 24);
    centralDirectoryHeader.writeUInt16LE(fileNameBuffer.length, 28);
    centralDirectoryHeader.writeUInt16LE(0, 30);
    centralDirectoryHeader.writeUInt16LE(0, 32);
    centralDirectoryHeader.writeUInt16LE(0, 34);
    centralDirectoryHeader.writeUInt16LE(0, 36);
    centralDirectoryHeader.writeUInt32LE(0, 38);
    centralDirectoryHeader.writeUInt32LE(localFileOffset, 42);

    centralDirectoryParts.push(centralDirectoryHeader, fileNameBuffer);
    localFileOffset += localHeader.length + fileNameBuffer.length + entryData.length;
  }

  const centralDirectoryOffset = localFileOffset;
  const centralDirectoryBuffer = Buffer.concat(centralDirectoryParts);
  const endOfCentralDirectory = Buffer.alloc(22);

  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(entries.length, 8);
  endOfCentralDirectory.writeUInt16LE(entries.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectoryBuffer.length, 12);
  endOfCentralDirectory.writeUInt32LE(centralDirectoryOffset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  return Buffer.concat([...zipParts, centralDirectoryBuffer, endOfCentralDirectory]);
};

/**
 * 计算 CRC32
 * @param buffer - 二进制内容
 * @returns CRC32 校验值
 * @throws 不抛出异常
 */
const crc32 = (buffer: Buffer): number => {
  let checksum = 0xffffffff;

  for (const byte of buffer) {
    checksum = crc32Table[(checksum ^ byte) & 0xff]! ^ (checksum >>> 8);
  }

  return (checksum ^ 0xffffffff) >>> 0;
};

/**
 * 转换为 DOS 日期时间
 * @param date - 当前时间
 * @returns DOS 时间与日期
 * @throws 不抛出异常
 */
const toDosDateTime = (date: Date): { dosTime: number; dosDate: number } => {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  return {
    dosTime,
    dosDate
  };
};
