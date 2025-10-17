import React, { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';

interface LogViewerProps {
  logs: string[] | Record<string, unknown>[];
}

const LogViewer: React.FC<LogViewerProps> = ({ logs }) => {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const highlightCode = async () => {
      try {
        setLoading(true);
        const code = JSON.stringify(logs, null, 2);
        const highlighted = await codeToHtml(code, {
          lang: 'json',
          theme: 'light-plus',
        });
        setHtml(highlighted);
      } catch (error) {
        console.error('Error highlighting code:', error);
        setHtml(`<pre>${JSON.stringify(logs, null, 2)}</pre>`);
      } finally {
        setLoading(false);
      }
    };

    highlightCode();
  }, [logs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-gray-500">Rendering logs...</div>
      </div>
    );
  }

  return (
    <div
      className="overflow-auto flex-1 min-h-0"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        fontSize: '14px',
        lineHeight: '1.5',
      }}
    />
  );
};

export default LogViewer;
