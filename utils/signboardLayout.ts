import { SignboardData, TextAlign } from '../types';

export function getTextAlignClass(align: TextAlign): string {
  switch (align) {
    case 'center': return 'text-center';
    case 'right': return 'text-right';
    default: return 'text-left';
  }
}

export function getFlexJustifyClass(align: TextAlign): string {
  switch (align) {
    case 'center': return 'justify-center';
    case 'right': return 'justify-end';
    default: return 'justify-start';
  }
}

export function getCanvasAlignX(x: number, width: number, align: TextAlign): number {
  switch (align) {
    case 'center': return x + width / 2;
    case 'right': return x + width;
    default: return x;
  }
}

/** 看板レイアウト比率（プレビューとCanvas出力で共通） */
export const SIGNBOARD_LAYOUT = {
  headerRatio: 0.3,
  labelColRatio: 0.2,
  contentPadRatio: 0.03,
  bodyTopPadRatio: 0.03,
  labelFontRatio: 0.06,
  headerFieldFontRatio: 0.07,
  bodyFontRatio: 0.08,
  bodyLineHeightRatio: 0.1,
} as const;

export function getSignboardFontSizes(height: number, data: SignboardData) {
  const { labelFontRatio, headerFieldFontRatio, bodyFontRatio, bodyLineHeightRatio } = SIGNBOARD_LAYOUT;
  return {
    label: Math.floor(height * labelFontRatio),
    title: Math.floor(height * headerFieldFontRatio * data.fontSizeTitle),
    details: Math.floor(height * headerFieldFontRatio * data.fontSizeDetails),
    item: Math.floor(height * bodyFontRatio * data.fontSizeItem),
    lineHeight: height * bodyLineHeightRatio * data.fontSizeItem,
    baseFontSize: height * bodyFontRatio,
  };
}

/** em ベースのプレビュー用スタイル（baseFontSize = height * bodyFontRatio） */
export function getSignboardEmStyles(data: SignboardData) {
  const headerEm = SIGNBOARD_LAYOUT.headerFieldFontRatio / SIGNBOARD_LAYOUT.bodyFontRatio;
  const labelEm = SIGNBOARD_LAYOUT.labelFontRatio / SIGNBOARD_LAYOUT.bodyFontRatio;
  const lineHeightEm = SIGNBOARD_LAYOUT.bodyLineHeightRatio / SIGNBOARD_LAYOUT.bodyFontRatio;
  return {
    label: `${labelEm}em`,
    title: `${headerEm * data.fontSizeTitle}em`,
    details: `${headerEm * data.fontSizeDetails}em`,
    item: `${data.fontSizeItem}em`,
    lineHeight: `${lineHeightEm * data.fontSizeItem}em`,
  };
}
