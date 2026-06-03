/**
 * 我的密码 Excel 导出接口
 */

import { defineEventHandler, setHeader } from 'h3';
import { createErrorResponse, getErrorMessage } from '../../utils/apiResponse';
import { listPasswordItems } from '../../utils/database';
import { createContentDisposition } from '../../utils/fileResponse';
import { createPasswordExportFile } from '../../utils/passwordExport';
import { assertAuthenticatedWritable, assertQueryUserId } from '../../utils/security';

export default defineEventHandler((event) => {
  try {
    assertQueryUserId(event);

    const session = assertAuthenticatedWritable(event);
    const items = listPasswordItems(session.profileId, '');
    const exportFile = createPasswordExportFile(items);

    setHeader(event, 'Content-Type', exportFile.contentType);
    setHeader(event, 'Content-Length', exportFile.buffer.length);
    setHeader(event, 'Content-Disposition', createContentDisposition(exportFile.fileName, true, 'passwords.xlsx'));
    setHeader(event, 'Cache-Control', 'no-store');

    return exportFile.buffer;
  } catch (error: unknown) {
    console.error(getErrorMessage(error));
    return createErrorResponse('PASSWORD_EXPORT_FAILED', getErrorMessage(error));
  }
});
