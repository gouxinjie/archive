/**
 * 日期时间格式化工具
 */

const sqliteUtcDateTimePattern = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

const chinaDateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

/**
 * 按中国时区格式化日期对象
 * @param date - Date 实例
 * @returns yyyy-MM-dd HH:mm:ss 格式文本
 * @throws 不抛出异常
 */
export const formatChinaDateTime = (date: Date): string => {
  let year = '';
  let month = '';
  let day = '';
  let hour = '';
  let minute = '';
  let second = '';

  for (const part of chinaDateTimeFormatter.formatToParts(date)) {
    switch (part.type) {
      case 'year':
        year = part.value;
        break;
      case 'month':
        month = part.value;
        break;
      case 'day':
        day = part.value;
        break;
      case 'hour':
        hour = part.value;
        break;
      case 'minute':
        minute = part.value;
        break;
      case 'second':
        second = part.value;
        break;
      default:
        break;
    }
  }

  if (!year || !month || !day || !hour || !minute || !second) {
    return '';
  }

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

/**
 * 将 SQLite 的 UTC 时间字符串格式化为中国时区显示文本
 * @param value - 数据库返回的时间字符串
 * @returns 中国时区时间文本，解析失败时返回原值
 * @throws 不抛出异常
 */
export const formatSqliteUtcToChinaDateTime = (value: string): string => {
  const normalizedValue = value.trim();
  const match = normalizedValue.match(sqliteUtcDateTimePattern);

  if (!match) {
    const fallbackDate = new Date(normalizedValue);

    if (Number.isNaN(fallbackDate.getTime())) {
      return value;
    }

    const formattedText = formatChinaDateTime(fallbackDate);
    return formattedText || value;
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const date = new Date(Date.UTC(
    Number(yearText),
    Number(monthText) - 1,
    Number(dayText),
    Number(hourText),
    Number(minuteText),
    Number(secondText)
  ));

  const formattedText = formatChinaDateTime(date);
  return formattedText || value;
};
