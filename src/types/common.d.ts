export type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SelectOption {
  /** 类型：字符串；含义：选项值；是否必填：是；默认值：无 */
  value: string;
  /** 类型：字符串；含义：选项展示文本；是否必填：是；默认值：无 */
  label: string;
}
