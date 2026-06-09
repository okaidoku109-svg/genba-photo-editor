import React from 'react';
import { SignboardData, SignboardType } from '../types';
import { SIGNBOARD_LAYOUT, getSignboardEmStyles, getTextAlignClass, getFlexJustifyClass } from '../utils/signboardLayout';

interface SignboardCanvasProps {
  type: SignboardType;
  data: SignboardData;
  height: number;
  className?: string;
  id?: string;
}

const SignboardCanvas: React.FC<SignboardCanvasProps> = ({ type, data, height, className = "", id }) => {
  const emStyles = getSignboardEmStyles(data);
  const baseFontSize = height * SIGNBOARD_LAYOUT.bodyFontRatio;
  const fieldJustify = getFlexJustifyClass(data.textAlign);
  const bodyAlign = getTextAlignClass(data.textAlign);

  const getStyles = () => {
    switch (type) {
      case SignboardType.BLACKBOARD:
        return { bg: "bg-[#004d40]", text: "text-white", border: "border-2 border-white", grid: "border-white", font: "font-serif" };
      case SignboardType.WHITE:
      default:
        return { bg: "bg-white", text: "text-slate-900", border: "border-2 border-slate-900", grid: "border-slate-900", font: "font-sans" };
    }
  };
  const styles = getStyles();

  return (
    <div
      id={id}
      className={`select-none overflow-hidden shadow-2xl flex flex-col ${styles.bg} ${styles.text} ${styles.border} ${styles.font} ${className}`}
      style={{ width: '100%', height: '100%', fontSize: baseFontSize, transformOrigin: 'top left' }}
    >
      <div className={`flex flex-col border-b-2 ${styles.grid} h-[30%]`}>
        <div className={`flex border-b ${styles.grid} h-1/2`}>
          <div className={`w-[20%] border-r ${styles.grid} flex items-center justify-center leading-none p-1 font-bold overflow-hidden`} style={{ fontSize: emStyles.label }}>工事名</div>
          <div className={`flex-1 flex items-center px-2 overflow-hidden min-w-0 ${fieldJustify}`}><span className="truncate max-w-full" style={{ fontSize: emStyles.title }}>{data.title}</span></div>
        </div>
        <div className="flex h-1/2">
          <div className={`w-[20%] border-r ${styles.grid} flex items-center justify-center leading-none p-1 font-bold overflow-hidden`} style={{ fontSize: emStyles.label }}>場　所</div>
          <div className={`flex-1 flex items-center px-2 overflow-hidden min-w-0 ${fieldJustify}`}><span className="truncate max-w-full" style={{ fontSize: emStyles.details }}>{data.details}</span></div>
        </div>
      </div>
      <div className={`flex-1 whitespace-pre-wrap overflow-hidden ${bodyAlign}`} style={{ padding: `${SIGNBOARD_LAYOUT.contentPadRatio * 100}%` }}>
        <span style={{ fontSize: emStyles.item, lineHeight: emStyles.lineHeight }}>{data.item}</span>
      </div>
    </div>
  );
};
export default SignboardCanvas;