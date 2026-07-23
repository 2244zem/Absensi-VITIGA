import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backButton?: boolean;
  action?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, backButton = false, action }) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        {backButton && (
          <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 text-stone-500 hover:bg-stone-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">{title}</h1>
          {subtitle && <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

export default PageHeader;
