import React from 'react';
import { SignboardData, SignboardType } from '../types';

interface SignboardCanvasProps {
  type: SignboardType;
  data: SignboardData;
  className?: string;
  id?: string;
}

const SignboardCanvas: React.FC<SignboardCanvasProps> = ({ type, data, className = "", id }) => {
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
    <div id={id} className={`select-none overflow-hidden shadow-2xl flex flex-col ${styles.bg} ${styles.text} ${styles.border} ${styles.font} ${className}`} style={{ width: '100%', height: '100%', transformOrigin: 'top left' }}>
      <div className={`flex flex-col border-b-2 ${styles.grid} h-[30%]`}>
        <div className={`flex border-b ${styles.grid} h-1/2`}>
          <div className={`w-[20%] border-r ${styles.grid} flex items-center justify-center text-[0.7em] leading-none p-1 font-bold`}>工事名</div>
          <div className="flex-1 flex items-center px-2"><span style={{ fontSize: `${0.8 * data.fontSizeTitle}em` }}>{data.title}</span></div>
        </div>
        <div className="flex h-1/2">
          <div className={`w-[20%] border-r ${styles.grid} flex items-center justify-center text-[0.7em] leading-none p-1 font-bold`}>場　所</div>
          <div className="flex-1 flex items-center px-2"><span style={{ fontSize: `${0.8 * data.fontSizeDetails}em` }}>{data.details}</span></div>
        </div>
      </div>
      <div className="flex-1 p-3 whitespace-pre-wrap leading-snug text-left overflow-hidden">
        <span style={{ fontSize: `${0.9 * data.fontSizeItem}em` }}>{data.item}</span>
      </div>
    </div>
  );
};
export default SignboardCanvas;